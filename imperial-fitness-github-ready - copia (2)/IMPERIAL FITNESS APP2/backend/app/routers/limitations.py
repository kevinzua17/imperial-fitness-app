from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import User, UserLimitation, SyncEvent
from app.schemas import UserLimitationCreate, UserLimitationOut, UserLimitationUpdate
from app.core.time import utcnow

router = APIRouter(prefix="/limitations", tags=["limitations"])


def _can_read_user(db: Session, user_id: int, current_user: User) -> User:
    client = db.get(User, user_id)
    if not client:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.role == "client" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id and client.id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes revisar clientes asignados")
    return client


@router.get("/users/{user_id}", response_model=list[UserLimitationOut])
def list_user_limitations(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _can_read_user(db, user_id, current_user)
    return db.query(UserLimitation).filter(UserLimitation.user_id == user_id).order_by(UserLimitation.created_at.desc()).all()


@router.post("", response_model=UserLimitationOut)
def create_user_limitation(payload: UserLimitationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = _can_read_user(db, payload.user_id, current_user)
    if current_user.role == "client" and current_user.id != payload.user_id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    item = UserLimitation(
        user_id=payload.user_id,
        body_area=payload.body_area,
        severity=payload.severity,
        comment=payload.comment,
        trainer_note=payload.trainer_note if current_user.role != "client" else "",
        status=payload.status or "active",
        created_by=current_user.id,
    )
    db.add(item)
    db.flush()
    db.add(SyncEvent(
        title="Modo Cuidado Imperial actualizado",
        detail=f"{current_user.name} registró una limitación para {client.name}: {item.body_area} ({item.severity}).",
        source="Modo Cuidado",
        target="Panel Coach",
        event_type="care",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    db.refresh(item)
    return item


@router.put("/{limitation_id}", response_model=UserLimitationOut)
def update_user_limitation(limitation_id: int, payload: UserLimitationUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    item = db.get(UserLimitation, limitation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Limitación no encontrada")
    _can_read_user(db, item.user_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    if item.status == "resolved" and item.resolved_at is None:
        item.resolved_at = utcnow()
    db.commit()
    db.refresh(item)
    return item


@router.put("/{limitation_id}/resolve", response_model=UserLimitationOut)
def resolve_user_limitation(limitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    item = db.get(UserLimitation, limitation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Limitación no encontrada")
    _can_read_user(db, item.user_id, current_user)
    item.status = "resolved"
    item.resolved_at = utcnow()
    db.commit()
    db.refresh(item)
    return item
