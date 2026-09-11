from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.sanitize import sanitize_text
from app.database import get_db
from app.deps import get_current_user, require_admin, require_admin_or_trainer
from app.models import User
from app.schemas import ChangePasswordRequest, UserCreate, UserOut, UserProfileUpdate, UserStatusUpdate
from app.security import hash_password, verify_password


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    query = db.query(User).order_by(User.created_at.desc())
    if role:
        query = query.filter(User.role == sanitize_text(role, 30))
    if status:
        query = query.filter(User.status == sanitize_text(status, 30))
    if current_user.role == "trainer":
        query = query.filter((User.assigned_trainer_id == current_user.id) | (User.id == current_user.id))
    return query.all()


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="El correo ya existe")

    payload_data = payload.model_dump(exclude={"password"})
    if payload_data.get("role") in {"admin", "trainer"}:
        payload_data["status"] = "active"

    user = User(**payload_data, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/admin/pending", response_model=list[UserOut])
def list_pending_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).filter(User.status == "pending").order_by(User.created_at.desc()).all()


@router.get("/clients", response_model=list[UserOut])
def list_clients(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    query = db.query(User).filter(User.role == "client").order_by(User.created_at.desc())
    if current_user.role == "trainer":
        query = query.filter(User.assigned_trainer_id == current_user.id)
    return query.all()


@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.id == current_user.id and payload.status != "active":
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    user.status = payload.status
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return update_user_status(user_id, UserStatusUpdate(status="active"), db, current_user)


@router.post("/{user_id}/reject", response_model=UserOut)
def reject_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return update_user_status(user_id, UserStatusUpdate(status="rejected"), db, current_user)


@router.post("/{user_id}/suspend", response_model=UserOut)
def suspend_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return update_user_status(user_id, UserStatusUpdate(status="suspended"), db, current_user)


@router.post("/{user_id}/reactivate", response_model=UserOut)
def reactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return update_user_status(user_id, UserStatusUpdate(status="active"), db, current_user)


def _can_admin_or_owner_or_assigned_trainer(current_user: User, target: User) -> bool:
    if current_user.role == "admin":
        return True
    if current_user.id == target.id:
        return True
    if current_user.role == "trainer" and target.role == "client" and target.assigned_trainer_id == current_user.id:
        return True
    return False


@router.patch("/{user_id}", response_model=UserOut)
def update_user_profile(
    user_id: int,
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not _can_admin_or_owner_or_assigned_trainer(current_user, user):
        raise HTTPException(status_code=403, detail="Permiso insuficiente")

    data = payload.model_dump(exclude_unset=True)

    # Solo administrador puede reasignar entrenadores o cambiar correos de terceros.
    if "assigned_trainer_id" in data and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede reasignar entrenadores")
    if "email" in data and current_user.role != "admin" and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="Solo el administrador puede cambiar correos de terceros")

    if "email" in data and data["email"] != user.email:
        exists = db.query(User).filter(User.email == data["email"], User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=409, detail="El correo ya existe")
    if "assigned_trainer_id" in data and data["assigned_trainer_id"] is not None:
        trainer = db.get(User, data["assigned_trainer_id"])
        if not trainer or trainer.role != "trainer" or trainer.status != "active":
            raise HTTPException(status_code=400, detail="Entrenador inválido o inactivo")

    allowed_for_self = {"name", "email", "avatar_url", "weight", "height", "body_fat", "muscle_mass", "goal"}
    allowed_for_trainer = {"weight", "height", "body_fat", "muscle_mass", "goal", "avatar_url"}
    if current_user.role != "admin":
        allowed = allowed_for_self if current_user.id == user.id else allowed_for_trainer
        data = {key: value for key, value in data.items() if key in allowed}

    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/change-password")
def change_password(
    user_id: int,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    if current_user.role != "admin" and not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    user.password_hash = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/assign-trainer", response_model=UserOut)
def assign_trainer(
    user_id: int,
    trainer_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user or user.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if trainer_id is not None:
        trainer = db.get(User, trainer_id)
        if not trainer or trainer.role != "trainer" or trainer.status != "active":
            raise HTTPException(status_code=400, detail="Entrenador inválido o inactivo")
    user.assigned_trainer_id = trainer_id
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.role == "trainer" and user.assigned_trainer_id != current_user.id and user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return user