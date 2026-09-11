from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import AssignedRoutine, DietPlan, SyncEvent, User
from app.services.plan_pdf import build_plan_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


def _published_plan_data(db: Session, client_id: int):
    routine = (
        db.query(AssignedRoutine)
        .filter(AssignedRoutine.client_id == client_id, AssignedRoutine.active == 1)
        .order_by(AssignedRoutine.created_at.desc(), AssignedRoutine.id.desc())
        .first()
    )
    diet = (
        db.query(DietPlan)
        .filter(
            DietPlan.client_id == client_id,
            DietPlan.active == 1,
            DietPlan.status == "published",
        )
        .order_by(DietPlan.version.desc(), DietPlan.created_at.desc(), DietPlan.id.desc())
        .first()
    )
    return routine, diet


def _coach_for_plan(db: Session, client: User, routine: AssignedRoutine | None, diet: DietPlan | None) -> User | None:
    coach_id = None
    if routine and routine.trainer_id:
        coach_id = routine.trainer_id
    elif diet and diet.approved_by:
        coach_id = diet.approved_by
    elif client.assigned_trainer_id:
        coach_id = client.assigned_trainer_id
    return db.get(User, coach_id) if coach_id else None


def _pdf_response(data: bytes, client: User) -> Response:
    safe_name = "".join(char for char in client.name if char.isalnum() or char in {"-", "_", " "}).strip().replace(" ", "-")
    safe_name = safe_name[:60] or f"cliente-{client.id}"
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Imperial-Fitness-Plan-{safe_name}.pdf"',
            "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


def _build_for_client(db: Session, client: User, actor: User) -> Response:
    routine, diet = _published_plan_data(db, client.id)
    if not routine and not diet:
        raise HTTPException(status_code=404, detail="El cliente todavía no tiene un plan publicado para exportar.")
    coach = _coach_for_plan(db, client, routine, diet)
    pdf = build_plan_pdf(client=client, coach=coach, routine=routine, diet=diet)
    db.add(SyncEvent(
        title="Plan PDF generado",
        detail=f"{actor.name} generó el PDF del plan publicado de {client.name}.",
        source="Reportes",
        target="Plan Imperial",
        event_type="plan_pdf",
        actor_user_id=actor.id,
        target_user_id=client.id,
    ))
    db.commit()
    return _pdf_response(pdf, client)


@router.get("/my-plan.pdf")
def download_my_plan_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Este reporte corresponde al cliente titular del plan.")
    return _build_for_client(db, current_user, current_user)


@router.get("/clients/{client_id}/plan.pdf")
def download_client_plan_pdf(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    client = db.get(User, client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes exportar planes de clientes asignados")
    return _build_for_client(db, client, current_user)
