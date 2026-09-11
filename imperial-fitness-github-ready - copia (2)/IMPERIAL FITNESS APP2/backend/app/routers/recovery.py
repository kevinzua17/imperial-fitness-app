from datetime import datetime
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.security import hash_password


router = APIRouter(prefix="/recovery", tags=["recovery"])


class RecoveryResolveRequest(BaseModel):
    admin_notes: str = Field(default="", max_length=1200)


class RecoveryRejectRequest(BaseModel):
    admin_notes: str = Field(default="", max_length=1200)


def _require_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar recuperación de cuentas")


def _temporary_password() -> str:
    # Suficientemente legible para WhatsApp, pero con mezcla de letras/números.
    suffix = "".join(random.choices(string.digits, k=4))
    letters = "".join(random.choices(string.ascii_letters, k=4))
    return f"Imperial{suffix}{letters}"


def _row_to_dict(row) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "email": row.email,
        "user_name": row.user_name,
        "phone_number": row.phone_number,
        "status": row.status,
        "requested_at": row.requested_at.isoformat() if row.requested_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "resolved_by": row.resolved_by,
        "admin_notes": row.admin_notes or "",
        "temporary_password_issued": bool(row.temporary_password_issued),
        "known_user": row.user_id is not None,
    }


@router.get("/pending-count")
def pending_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    count = db.execute(
        text("select count(*) from public.password_reset_requests where status = 'pending'")
    ).scalar_one()
    return {"count": int(count or 0)}


@router.get("/requests")
def list_requests(
    status: str = "pending",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    if status not in {"pending", "resolved", "rejected", "all"}:
        raise HTTPException(status_code=400, detail="Estado no válido")

    where = ""
    params: dict[str, str] = {}
    if status != "all":
        where = "where status = :status"
        params["status"] = status

    rows = db.execute(
        text(
            f"""
            select
              id,
              user_id,
              email,
              user_name,
              phone_number,
              status,
              requested_at,
              resolved_at,
              resolved_by,
              admin_notes,
              temporary_password_issued
            from public.password_reset_requests
            {where}
            order by
              case when status = 'pending' then 0 else 1 end,
              requested_at desc
            limit 100
            """
        ),
        params,
    ).fetchall()

    return [_row_to_dict(row) for row in rows]


@router.post("/requests/{request_id}/temporary-password")
def generate_temporary_password(
    request_id: int,
    payload: RecoveryResolveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    row = db.execute(
        text(
            """
            select id, user_id, email, status
            from public.password_reset_requests
            where id = :request_id
            """
        ),
        {"request_id": request_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail="La solicitud ya fue gestionada")
    if not row.user_id:
        raise HTTPException(status_code=400, detail="No hay usuario registrado con ese correo")

    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    temporary_password = _temporary_password()
    user.password_hash = hash_password(temporary_password)
    user.token_version = (user.token_version or 0) + 1
    user.failed_login_attempts = 0
    user.locked_until = None
    # Si la columna existe, se marca para que más adelante podamos forzar cambio al entrar.
    try:
        setattr(user, "force_password_change", 1)
    except Exception:
        pass

    db.execute(
        text(
            """
            update public.password_reset_requests
            set
              status = 'resolved',
              resolved_at = now(),
              resolved_by = :resolved_by,
              admin_notes = :admin_notes,
              temporary_password_issued = 1
            where id = :request_id
            """
        ),
        {
            "request_id": request_id,
            "resolved_by": current_user.id,
            "admin_notes": payload.admin_notes or "Clave temporal generada desde panel admin.",
        },
    )
    db.commit()

    return {
        "ok": True,
        "temporary_password": temporary_password,
        "message": "Clave temporal generada. El usuario debe cambiarla al ingresar.",
    }


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    payload: RecoveryRejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    result = db.execute(
        text(
            """
            update public.password_reset_requests
            set
              status = 'rejected',
              resolved_at = now(),
              resolved_by = :resolved_by,
              admin_notes = :admin_notes
            where id = :request_id and status = 'pending'
            """
        ),
        {
            "request_id": request_id,
            "resolved_by": current_user.id,
            "admin_notes": payload.admin_notes or "Solicitud rechazada por administrador.",
        },
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o ya gestionada")

    return {"ok": True}
