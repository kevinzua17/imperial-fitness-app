import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user, require_admin_or_trainer
from app.models import Exercise, SyncEvent, User
from app.schemas import ExerciseCreate, ExerciseOut, ExerciseUpdate

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _to_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return [x.strip() for x in value.split(",") if x.strip()]


def _out(row: Exercise) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "image_url": row.image_url,
        "category": row.category,
        "segment": row.segment,
        "movement_pattern": row.movement_pattern,
        "primary_muscle": row.primary_muscle,
        "secondary_muscles": _to_list(row.secondary_muscles),
        "equipment": row.equipment,
        "level": row.level,
        "is_active": bool(row.is_active),
        "is_visible": bool(row.is_visible),
        "is_routine_eligible": bool(row.is_routine_eligible),
        "review_status": row.review_status,
        "source": row.source,
        "coach_notes": row.coach_notes,
    }


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    segment: str | None = None,
    muscle: str | None = None,
    source: str | None = None,
    routine_eligible: bool | None = None,
    include_inactive: bool = False,
    limit: int = Query(default=500, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_scope = "client" if current_user.role == "client" else "coach"
    cache_key = f"exercises:{role_scope}:{segment or 'all'}:{muscle or 'all'}:{source or 'all'}:{routine_eligible}:{include_inactive}:{limit}:{offset}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Exercise)
    if current_user.role == "client":
        query = query.filter(
            Exercise.is_active == 1,
            Exercise.is_visible == 1,
            Exercise.review_status == "approved",
        )
    elif not include_inactive:
        query = query.filter(Exercise.is_active == 1)
    if segment:
        query = query.filter(Exercise.segment == segment)
    if muscle:
        term = f"%{muscle.strip()}%"
        query = query.filter((Exercise.primary_muscle.ilike(term)) | (Exercise.secondary_muscles.ilike(term)))
    if source:
        query = query.filter(Exercise.source == source)
    if routine_eligible is not None:
        query = query.filter(Exercise.is_routine_eligible == int(routine_eligible))
    rows = query.order_by(Exercise.name.asc()).offset(offset).limit(limit).all()
    result = [_out(row) for row in rows]
    cache.set(cache_key, result)
    return result


@router.post("", response_model=ExerciseOut)
def create_exercise(payload: ExerciseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    row = Exercise(**payload.model_dump(exclude={"secondary_muscles"}), secondary_muscles=json.dumps(payload.secondary_muscles or []), created_by=current_user.id)
    db.add(row)
    db.flush()
    db.add(SyncEvent(
        title="Ejercicio creado",
        detail=f"{current_user.name} creó el ejercicio {row.name}.",
        source="Biblioteca de Ejercicios",
        target="Planes",
        event_type="exercise",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(row)
    cache.delete_prefix("exercises:")
    return _out(row)


@router.put("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(exercise_id: int, payload: ExerciseUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    row = db.get(Exercise, exercise_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    updates = payload.model_dump(exclude_unset=True)
    if "secondary_muscles" in updates:
        row.secondary_muscles = json.dumps(updates.pop("secondary_muscles") or [])
    for field, value in updates.items():
        setattr(row, field, value)
    db.add(SyncEvent(
        title="Ejercicio actualizado",
        detail=f"{current_user.name} actualizó el ejercicio {row.name}.",
        source="Biblioteca de Ejercicios",
        target="Planes",
        event_type="exercise",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(row)
    cache.delete_prefix("exercises:")
    return _out(row)
