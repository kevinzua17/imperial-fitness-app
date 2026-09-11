import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user, require_admin_or_trainer
from app.models import AssignedRoutine, RoutineTemplate, SyncEvent, User
from app.schemas import AssignedRoutineCreate, AssignedRoutineOut, AssignedRoutineUpdate, RoutineTemplateCreate, RoutineTemplateOut, RoutineTemplateUpdate
from app.core.sanitize import sanitize_text


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
def list_assigned_routines(client_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(AssignedRoutine).filter(AssignedRoutine.active == 1).order_by(AssignedRoutine.created_at.desc())
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
def get_my_assigned_routine(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routine = db.query(AssignedRoutine).filter(AssignedRoutine.client_id == current_user.id, AssignedRoutine.active == 1).order_by(AssignedRoutine.created_at.desc()).first()
    return routine


@router.post("/assigned", response_model=AssignedRoutineOut)
def create_assigned_routine(payload: AssignedRoutineCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    client = db.get(User, payload.client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes asignar rutinas a clientes asignados")
    db.query(AssignedRoutine).filter(AssignedRoutine.client_id == payload.client_id, AssignedRoutine.active == 1).update({"active": 0})
    routine_data = payload.model_dump()
    routine_data["active"] = 1
    routine = AssignedRoutine(**routine_data, trainer_id=current_user.id)
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
    return routine, client


@router.put("/assigned/{routine_id}", response_model=AssignedRoutineOut)
def update_assigned_routine(
    routine_id: int,
    payload: AssignedRoutineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    routine, client = _get_manageable_routine(routine_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(routine, field, value)
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
