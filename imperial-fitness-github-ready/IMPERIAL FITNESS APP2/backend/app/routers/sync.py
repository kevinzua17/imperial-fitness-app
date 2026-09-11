from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import SyncEvent, User
from app.schemas import SyncEventCreate, SyncEventOut


router = APIRouter(prefix="/sync", tags=["sync"])


def _visible_sync_query(db: Session, current_user: User):
    query = db.query(SyncEvent)
    if current_user.role == "admin":
        return query
    if current_user.role == "client":
        return query.filter(or_(
            SyncEvent.actor_user_id == current_user.id,
            SyncEvent.target_user_id == current_user.id,
            SyncEvent.target_user_id.is_(None),
        ))
    if current_user.role == "trainer":
        assigned_client_ids = [row.id for row in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
        return query.filter(or_(
            SyncEvent.actor_user_id == current_user.id,
            SyncEvent.target_user_id == current_user.id,
            SyncEvent.actor_user_id.in_(assigned_client_ids),
            SyncEvent.target_user_id.in_(assigned_client_ids),
            SyncEvent.target_user_id.is_(None),
        ))
    raise HTTPException(status_code=403, detail="Permiso insuficiente")


@router.get("/events", response_model=list[SyncEventOut])
def list_sync_events(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _visible_sync_query(db, current_user).order_by(SyncEvent.created_at.desc()).limit(50).all()


@router.post("/events", response_model=SyncEventOut)
def create_sync_event(
    payload: SyncEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump()
    data["actor_user_id"] = current_user.id
    target_user_id = data.get("target_user_id")
    if current_user.role == "client" and target_user_id not in {None, current_user.assigned_trainer_id}:
        raise HTTPException(status_code=403, detail="Solo puedes notificar a tu entrenador asignado")
    if current_user.role == "trainer" and target_user_id is not None:
        target = db.get(User, target_user_id)
        if not target or (target.role == "client" and target.assigned_trainer_id != current_user.id):
            raise HTTPException(status_code=403, detail="Solo puedes notificar a tus clientes asignados")
    event = SyncEvent(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
