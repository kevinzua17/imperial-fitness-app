from pathlib import Path
import re
import unicodedata

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.uploads import save_image_upload
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import AppSetting, User
from app.schemas import AvatarUploadOut, LogoUploadOut


router = APIRouter(prefix="/media", tags=["media"])
settings = get_settings()

FOOD_IMAGE_SETTING_PREFIX = "food_image:"


def _food_media_key(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "alimento")
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")[:96]
    return normalized or "alimento"


def _is_allowed_food_image_url(value: str) -> bool:
    value = (value or "").strip()
    if not value:
        return False
    if value.startswith("/uploads/") or value.startswith("/foods/"):
        return True
    return value.startswith("https://")

def _existing_upload_or_default(value: str | None, fallback: str) -> str:
    if not value:
        return fallback
    if value.startswith('/uploads/'):
        relative_path = value.removeprefix('/uploads/').lstrip('/')
        if not (Path(settings.upload_dir) / relative_path).exists():
            return fallback
    return value


def _set_setting(db: Session, key: str, value: str) -> None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not row:
        row = AppSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    db.commit()


@router.get("/logo", response_model=LogoUploadOut)
def get_logo(db: Session = Depends(get_db)):
    row = db.query(AppSetting).filter(AppSetting.key == "gym_logo_url").first()
    return {"logo_url": _existing_upload_or_default(row.value if row else None, settings.default_logo_url)}


@router.get("/branding")
def get_branding(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).filter(AppSetting.key.in_([
        "gym_logo_url",
        "login_background_url",
        "gym_name",
        "primary_color",
    ])).all()
    values = {row.key: row.value for row in rows}
    fallback_background = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&auto=format&fit=crop&q=80"
    return {
        "gym_logo_url": _existing_upload_or_default(values.get("gym_logo_url"), settings.default_logo_url),
        "login_background_url": _existing_upload_or_default(values.get("login_background_url"), fallback_background),
        "gym_name": values.get("gym_name", "IMPERIAL FITNESS"),
        "primary_color": values.get("primary_color", "#dc2626"),
    }


@router.post("/logo", response_model=LogoUploadOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logo_url = await save_image_upload(file, "logos")
    _set_setting(db, "gym_logo_url", logo_url)
    return {"logo_url": logo_url}


@router.post("/login-background")
async def upload_login_background(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    background_url = await save_image_upload(file, "branding")
    _set_setting(db, "login_background_url", background_url)
    return {"login_background_url": background_url}


@router.patch("/branding")
def update_branding(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    allowed_keys = {"gym_name", "primary_color"}
    for key, value in payload.items():
        if key in allowed_keys and isinstance(value, str):
            _set_setting(db, key, value[:160])
    return get_branding(db)


@router.post("/users/{user_id}/avatar", response_model=AvatarUploadOut)
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    can_update = (
        current_user.role == "admin"
        or current_user.id == user_id
        or (current_user.role == "trainer" and user.role == "client" and user.assigned_trainer_id == current_user.id)
    )
    if not can_update:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    avatar_url = await save_image_upload(file, "avatars")
    user.avatar_url = avatar_url
    db.commit()
    return {"user_id": user_id, "avatar_url": avatar_url}

@router.post("/exercises/{exercise_id}/image")
async def upload_exercise_image(
    exercise_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    image_url = await save_image_upload(file, "exercises")
    return {"exercise_id": exercise_id, "image_url": image_url}

@router.get("/foods/images")
def get_food_images(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(AppSetting).filter(AppSetting.key.like(f"{FOOD_IMAGE_SETTING_PREFIX}%")).all()
    images = {}
    for row in rows:
        food_key = row.key.removeprefix(FOOD_IMAGE_SETTING_PREFIX)
        if row.value:
            images[food_key] = _existing_upload_or_default(row.value, row.value)
    return {"images": images}


@router.patch("/foods/{food_key}/image")
def set_food_image(
    food_key: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    image_url = str(payload.get("image_url", "")).strip()
    if not _is_allowed_food_image_url(image_url):
        raise HTTPException(status_code=400, detail="Usa una URL https o una ruta /uploads/ o /foods/ válida")
    safe_key = _food_media_key(food_key)
    _set_setting(db, f"{FOOD_IMAGE_SETTING_PREFIX}{safe_key}", image_url[:600])
    return {"food_key": safe_key, "image_url": image_url[:600]}


@router.post("/foods/{food_key}/image")
async def upload_food_image(
    food_key: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    safe_key = _food_media_key(food_key)
    image_url = await save_image_upload(file, "foods")
    _set_setting(db, f"{FOOD_IMAGE_SETTING_PREFIX}{safe_key}", image_url)
    return {"food_key": safe_key, "image_url": image_url}
