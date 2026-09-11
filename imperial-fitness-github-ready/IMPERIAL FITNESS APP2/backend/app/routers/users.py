from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.sanitize import sanitize_text
from app.core.time import utcnow
from app.database import get_db
from app.deps import get_current_user, require_admin, require_admin_or_trainer
from app.models import User
from app.schemas import ChangePasswordRequest, UserAccessUpdate, UserCreate, UserOut, UserProfileUpdate, UserStatusUpdate
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
    clean_email = str(payload.email).strip().lower()
    exists = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if exists:
        raise HTTPException(status_code=409, detail="El correo ya existe")

    payload_data = payload.model_dump(exclude={"password"})
    payload_data["email"] = clean_email
    if payload_data.get("role") in {"admin", "trainer"}:
        payload_data["status"] = "active"

    now = utcnow()
    payload_data["status_changed_at"] = now
    if payload_data.get("status") == "active":
        payload_data["activated_at"] = now
    elif payload_data.get("status") == "pending":
        payload_data["pending_at"] = now
    elif payload_data.get("status") == "suspended":
        payload_data["suspended_at"] = now
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


def _apply_access_status(user: User, status: str, changed_at=None) -> None:
    moment = changed_at or utcnow()
    user.status = status
    user.status_changed_at = moment
    if status == "pending":
        user.pending_at = moment
    elif status == "active":
        user.activated_at = moment
    elif status == "suspended":
        user.suspended_at = moment


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
    _apply_access_status(user, payload.status)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/access", response_model=UserOut)
def update_user_access(
    user_id: int,
    payload: UserAccessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.id == current_user.id and payload.status and payload.status != "active":
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")

    data = payload.model_dump(exclude_unset=True)
    status = data.pop("status", None)
    changed_at = data.get("status_changed_at")
    if status:
        _apply_access_status(user, status, changed_at)
    # Las fechas enviadas explícitamente por administración prevalecen sobre
    # las fechas automáticas creadas al cambiar el estado.
    nutrition_safety_fields = {"eating_pattern", "dietary_preferences", "excluded_foods", "food_allergies", "food_intolerances", "medical_conditions", "medications"}
    if nutrition_safety_fields.intersection(data):
        # Cualquier cambio del cliente invalida la revisión previa del coach.
        user.nutrition_reviewed_at = None
        user.nutrition_reviewed_by = None

    for key, value in data.items():
        setattr(user, key, value)

    # Nunca dejar el estado actual sin su fecha principal, incluso si el
    # administrador vacía accidentalmente el campo en el editor avanzado.
    user.status_changed_at = user.status_changed_at or utcnow()
    if user.status == "pending":
        user.pending_at = user.pending_at or user.status_changed_at
    elif user.status == "active":
        user.activated_at = user.activated_at or user.status_changed_at
    elif user.status == "suspended":
        user.suspended_at = user.suspended_at or user.status_changed_at

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
        data["email"] = str(data["email"]).strip().lower()
        exists = db.query(User).filter(func.lower(User.email) == data["email"], User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=409, detail="El correo ya existe")
    if "assigned_trainer_id" in data and data["assigned_trainer_id"] is not None:
        trainer = db.get(User, data["assigned_trainer_id"])
        if not trainer or trainer.role != "trainer" or trainer.status != "active":
            raise HTTPException(status_code=400, detail="Entrenador inválido o inactivo")

    allowed_for_self = {"name", "email", "avatar_url", "phone_number", "whatsapp_opt_in", "weight", "height", "age", "gender", "body_fat", "muscle_mass", "goal", "activity_level", "workouts_per_week", "average_daily_steps", "occupation_activity", "eating_pattern", "dietary_preferences", "excluded_foods", "food_allergies", "food_intolerances", "medical_conditions", "medications"}
    allowed_for_trainer = {"phone_number", "whatsapp_opt_in", "weight", "height", "age", "gender", "body_fat", "muscle_mass", "goal", "activity_level", "workouts_per_week", "average_daily_steps", "occupation_activity", "eating_pattern", "dietary_preferences", "excluded_foods", "food_allergies", "food_intolerances", "medical_conditions", "medications", "avatar_url"}
    if current_user.role != "admin":
        allowed = allowed_for_self if current_user.id == user.id else allowed_for_trainer
        data = {key: value for key, value in data.items() if key in allowed}

    nutrition_safety_fields = {"eating_pattern", "dietary_preferences", "excluded_foods", "food_allergies", "food_intolerances", "medical_conditions", "medications"}
    if nutrition_safety_fields.intersection(data):
        # Cualquier cambio del cliente invalida la revisión previa del coach.
        user.nutrition_reviewed_at = None
        user.nutrition_reviewed_by = None

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

    # El administrador puede actualizar contraseñas de cualquier cuenta interna o cliente
    # sin conocer la clave anterior. El usuario normal sí debe confirmar su contraseña actual.
    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permiso insuficiente")

    if current_user.role != "admin":
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Contraseña actual requerida")
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")

    user.password_hash = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    user.failed_login_attempts = 0
    user.locked_until = None
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