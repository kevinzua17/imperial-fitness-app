import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user, require_admin_or_trainer
from app.models import AssignedRoutine, RoutineTemplate, SyncEvent, User
from app.schemas import AssignedRoutineCreate, AssignedRoutineOut, AssignedRoutineUpdate, RoutineTemplateCreate, RoutineTemplateOut, RoutineTemplateUpdate
from app.core.sanitize import sanitize_text
from app.middleware.membership_access import _membership_status
from app.services.routine_safety import validate_generated_routine_safety


router = APIRouter(prefix="/routines", tags=["routines"])


def _template_to_dict(row: RoutineTemplate):
    return {
        "id": row.id,
        "title": row.title,
        "target_goal": row.target_goal,
        "level": row.level,
        "days_per_week": row.days_per_week,
        "description": row.description,
        "trainer_rationale": row.trainer_rationale,
        "payload": json.loads(row.payload_json or "{}"),
    }


@router.post("/templates", response_model=RoutineTemplateOut)
def create_routine_template(
    payload: RoutineTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    template = RoutineTemplate(**payload.model_dump())
    db.add(template)
    db.flush()
    db.add(SyncEvent(
        title="Plantilla de rutina creada",
        detail=f"{current_user.name} creó la plantilla {template.title}.",
        source="Rutinas",
        target="Panel Coach",
        event_type="routine",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(template)
    cache.delete_prefix("routine_templates:")
    cache.delete_prefix("sync:")
    return template


@router.put("/templates/{template_id}", response_model=RoutineTemplateOut)
def update_routine_template(
    template_id: int,
    payload: RoutineTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    template = db.get(RoutineTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    db.add(SyncEvent(
        title="Plantilla de rutina actualizada",
        detail=f"{current_user.name} actualizó la plantilla {template.title}.",
        source="Rutinas",
        target="Panel Coach",
        event_type="routine",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(template)
    cache.delete_prefix("routine_templates:")
    cache.delete_prefix("sync:")
    return template


@router.get("/templates")
def list_routine_templates(
    goal: str | None = None,
    level: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"routine_templates:{goal or 'all'}:{level or 'all'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    query = db.query(RoutineTemplate).order_by(RoutineTemplate.title.asc())
    if goal:
        query = query.filter(RoutineTemplate.target_goal.ilike(f"%{sanitize_text(goal, 80)}%"))
    if level:
        query = query.filter(RoutineTemplate.level == sanitize_text(level, 50))
    rows = query.all()
    result = [
        {
            "id": row.id,
            "title": row.title,
            "target_goal": row.target_goal,
            "level": row.level,
            "days_per_week": row.days_per_week,
            "description": row.description,
            "trainer_rationale": row.trainer_rationale,
            "payload": json.loads(row.payload_json or "{}"),
        }
        for row in rows
    ]
    cache.set(cache_key, result)
    return result


@router.get("/assigned", response_model=list[AssignedRoutineOut])
def list_assigned_routines(response: Response, client_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    query = db.query(AssignedRoutine).filter(AssignedRoutine.active == 1).order_by(AssignedRoutine.created_at.desc(), AssignedRoutine.id.desc())
    if current_user.role == "client":
        query = query.filter(AssignedRoutine.client_id == current_user.id)
    elif current_user.role == "trainer":
        assigned_ids = [row.id for row in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
        query = query.filter(AssignedRoutine.client_id.in_(assigned_ids))
    if client_id:
        if current_user.role == "client" and client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Permiso insuficiente")
        query = query.filter(AssignedRoutine.client_id == client_id)
    return query.all()


@router.get("/assigned/my-routine", response_model=AssignedRoutineOut | None)
def get_my_assigned_routine(response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    routine = db.query(AssignedRoutine).filter(AssignedRoutine.client_id == current_user.id, AssignedRoutine.active == 1).order_by(AssignedRoutine.created_at.desc(), AssignedRoutine.id.desc()).first()
    return routine


@router.post("/assigned", response_model=AssignedRoutineOut)
def create_assigned_routine(payload: AssignedRoutineCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    client = db.query(User).filter(User.id == payload.client_id).with_for_update().one_or_none()
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes asignar rutinas a clientes asignados")
    validate_generated_routine_safety(db, payload.client_id, payload.payload_json)
    db.query(AssignedRoutine).filter(AssignedRoutine.client_id == payload.client_id, AssignedRoutine.active == 1).update({"active": 0})
    routine_data = payload.model_dump()
    routine_data["active"] = 1
    routine = AssignedRoutine(**routine_data, trainer_id=current_user.id)
    try:
        db.add(routine)
        db.flush()
        db.add(SyncEvent(
            title="Rutina asignada",
            detail=f"{current_user.name} asignó la rutina {routine.title} a {client.name}.",
            source="Panel Coach",
            target="App Cliente",
            event_type="plan",
            actor_user_id=current_user.id,
            target_user_id=client.id,
        ))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Otra asignación de rutina se guardó al mismo tiempo. Sincroniza el cliente y vuelve a intentarlo.",
        ) from exc
    db.refresh(routine)
    cache.delete_prefix("sync:")
    return routine

def _can_manage_client(db: Session, client_id: int, current_user: User) -> User:
    client = db.get(User, client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes gestionar clientes asignados")
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return client


def _get_manageable_routine(routine_id: int, db: Session, current_user: User) -> tuple[AssignedRoutine, User]:
    routine = db.get(AssignedRoutine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina asignada no encontrada")
    client = _can_manage_client(db, routine.client_id, current_user)
    if routine.active != 1:
        raise HTTPException(status_code=409, detail="Esta rutina ya no es la asignación activa. Sincroniza el cliente antes de guardar cambios.")
    return routine, client


@router.get("/assigned/client-health/{client_id}")
def get_assigned_routine_delivery_health(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    """Verify the complete delivery path, not only that an admin can read the row.

    The previous publication check queried the routine with the trainer/admin token.
    A client could therefore remain blocked by membership state even while the coach
    saw a successful publication message. This endpoint reports those blockers using
    the exact client account and active assignment.
    """
    client = _can_manage_client(db, client_id, current_user)
    active_rows = (
        db.query(AssignedRoutine)
        .filter(AssignedRoutine.client_id == client.id, AssignedRoutine.active == 1)
        .order_by(AssignedRoutine.created_at.desc(), AssignedRoutine.id.desc())
        .all()
    )
    routine = active_rows[0] if active_rows else None

    payload_valid = False
    day_count = 0
    exercise_count = 0
    payload_chars = len(routine.payload_json or "") if routine else 0
    payload_error = ""
    if routine:
        try:
            parsed = json.loads(routine.payload_json or "{}")
            days = parsed.get("days") if isinstance(parsed, dict) else []
            days = days if isinstance(days, list) else []
            day_count = len(days)
            exercise_count = sum(
                len(day.get("exercises") or [])
                for day in days
                if isinstance(day, dict) and isinstance(day.get("exercises") or [], list)
            )
            payload_valid = True
        except (TypeError, ValueError, json.JSONDecodeError) as exc:
            payload_error = str(exc)[:240]

    duplicate_email_ids = [
        row.id
        for row in db.query(User.id)
        .filter(func.lower(User.email) == client.email.lower())
        .order_by(User.id.asc())
        .all()
    ]

    membership_available = False
    membership_status = "not_configured"
    membership_restricted = False
    pending_payments = 0
    next_payment_due = None
    membership_error = ""

    if db.bind is not None and db.bind.dialect.name != "sqlite":
        try:
            account = db.execute(
                text("select * from public.membership_accounts where user_id = :user_id"),
                {"user_id": client.id},
            ).mappings().first()
            if account:
                membership_available = True
                pending = db.execute(
                    text(
                        "select count(*) as total from public.membership_payments "
                        "where user_id = :user_id and status = 'pending'"
                    ),
                    {"user_id": client.id},
                ).mappings().first()
                pending_payments = int((pending or {}).get("total") or 0)

                grace_row = db.execute(
                    text("select value from public.app_settings where key = 'membership_grace_days'")
                ).mappings().first()
                suspension_row = db.execute(
                    text("select value from public.app_settings where key = 'membership_suspension_days'")
                ).mappings().first()
                membership_status = _membership_status(
                    dict(account),
                    pending_payments > 0,
                    grace_days=int((grace_row or {}).get("value") or 3),
                    suspension_days=int((suspension_row or {}).get("value") or 7),
                )
                membership_restricted = membership_status in {"pending_validation", "limited", "suspended"}
                next_payment_due = account.get("next_payment_due")
                if next_payment_due is not None:
                    next_payment_due = str(next_payment_due)
        except (SQLAlchemyError, TypeError, ValueError) as exc:
            db.rollback()
            membership_error = str(exc)[:240]

    blockers: list[str] = []
    if client.status != "active":
        blockers.append(f"la cuenta del cliente está en estado {client.status}")
    if len(active_rows) == 0:
        blockers.append("no existe una rutina activa")
    elif len(active_rows) > 1:
        blockers.append(f"existen {len(active_rows)} rutinas activas simultáneas")
    if routine and not payload_valid:
        blockers.append("el contenido guardado de la rutina no es válido")
    if routine and payload_valid and (day_count == 0 or exercise_count == 0):
        blockers.append("la rutina activa no contiene días y ejercicios completos")
    if membership_restricted:
        blockers.append(f"la membresía está en estado {membership_status} y bloquea los módulos premium")
    if len(duplicate_email_ids) > 1:
        blockers.append(f"hay {len(duplicate_email_ids)} cuentas con el mismo correo ignorando mayúsculas")

    return {
        "delivery_ready": len(blockers) == 0,
        "blocking_reasons": blockers,
        "client": {
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "status": client.status,
            "duplicate_email_user_ids": duplicate_email_ids,
        },
        "routine": {
            "active_count": len(active_rows),
            "id": routine.id if routine else None,
            "title": routine.title if routine else None,
            "payload_chars": payload_chars,
            "payload_valid": payload_valid,
            "payload_error": payload_error,
            "day_count": day_count,
            "exercise_count": exercise_count,
        },
        "membership": {
            "available": membership_available,
            "status": membership_status,
            "restricted": membership_restricted,
            "pending_payments": pending_payments,
            "next_payment_due": next_payment_due,
            "error": membership_error,
        },
        "client_endpoint": "/routines/assigned/my-routine",
    }


@router.put("/assigned/{routine_id}", response_model=AssignedRoutineOut)
def update_assigned_routine(
    routine_id: int,
    payload: AssignedRoutineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    routine, client = _get_manageable_routine(routine_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "payload_json" in updates:
        validate_generated_routine_safety(db, routine.client_id, updates["payload_json"])
    for field, value in updates.items():
        setattr(routine, field, value)
    routine.active = 1
    db.add(SyncEvent(
        title="Rutina actualizada",
        detail=f"{current_user.name} actualizó la rutina {routine.title} de {client.name}.",
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    db.refresh(routine)
    cache.delete_prefix("sync:")
    return routine


@router.delete("/assigned/{routine_id}")
def deactivate_assigned_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    routine, client = _get_manageable_routine(routine_id, db, current_user)
    routine.active = 0
    db.add(SyncEvent(
        title="Rutina desactivada",
        detail=f"{current_user.name} desactivó la rutina {routine.title} de {client.name}.",
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    cache.delete_prefix("sync:")
    return {"ok": True}
