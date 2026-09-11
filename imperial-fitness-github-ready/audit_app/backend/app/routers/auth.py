from datetime import datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import PasswordResetToken, RefreshToken, User
from app.schemas import ForgotPasswordRequest, ForgotPasswordResponse, LoginRequest, LoginResponse, PublicClientRegister, RefreshTokenResponse, ResetPasswordRequest, UserOut
from app.security import create_access_token, generate_secure_token, hash_password, hash_token, verify_password
from app.jobs.queue import enqueue_job
from app.services.email_service import send_password_reset_email


router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/auth",
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
    )


def _create_refresh_token(user: User, db: Session) -> str:
    raw_token = generate_secure_token()
    db.add(RefreshToken(user_id=user.id, token_hash=hash_token(raw_token), expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)))
    db.commit()
    return raw_token


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    now = datetime.utcnow()
    if user and user.locked_until and user.locked_until > now:
        raise HTTPException(status_code=429, detail="Cuenta bloqueada temporalmente por intentos fallidos")
    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = now + timedelta(minutes=settings.login_lock_minutes)
            db.commit()
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Cuenta pendiente de aprobación")
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    access_token = create_access_token(subject=str(user.id), token_version=user.token_version or 0)
    refresh_token = _create_refresh_token(user, db)
    _set_refresh_cookie(response, refresh_token)
    return {"access_token": access_token, "user": user}


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(response: Response, refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name), db: Session = Depends(get_db)):
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Refresh token requerido")
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_cookie)).first()
    if not row or row.revoked_at or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    user = db.get(User, row.user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=403, detail="Cuenta pendiente de aprobación")
    row.revoked_at = datetime.utcnow()
    db.commit()
    new_refresh = _create_refresh_token(user, db)
    _set_refresh_cookie(response, new_refresh)
    return {"access_token": create_access_token(subject=str(user.id), token_version=user.token_version or 0)}


@router.post("/logout-all")
def logout_all(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.token_version = (current_user.token_version or 0) + 1
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id, RefreshToken.revoked_at.is_(None)).update({"revoked_at": datetime.utcnow()})
    db.commit()
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response, refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name), db: Session = Depends(get_db)):
    if refresh_cookie:
        row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_cookie), RefreshToken.revoked_at.is_(None)).first()
        if row:
            row.revoked_at = datetime.utcnow()
            db.commit()
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"detail": "Si el correo existe, se enviará un enlace de recuperación."}
    raw_token = generate_secure_token()
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(raw_token), expires_at=datetime.utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)))
    db.commit()
    reset_url = f"{settings.frontend_url}/?reset_token={raw_token}"
    if not enqueue_job(send_password_reset_email, payload.email, reset_url):
        send_password_reset_email(payload.email, reset_url)
    response = {"detail": "Si el correo existe, se enviará un enlace de recuperación."}
    if settings.app_env in {"local", "test"}:
        response["reset_token_dev"] = raw_token
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == hash_token(payload.token)).first()
    if not row or row.used_at or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token de recuperación inválido")
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.password_hash = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    row.used_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/register", response_model=UserOut, status_code=201)
def register_client(payload: PublicClientRegister, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="El correo ya existe")
    user = User(name=payload.name, email=payload.email, role="client", status="pending", password_hash=hash_password(payload.password), goal=payload.goal, weight=payload.weight, height=payload.height, tokens=0)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user