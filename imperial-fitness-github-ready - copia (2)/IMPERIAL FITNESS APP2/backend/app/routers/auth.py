from datetime import datetime, timedelta
import json

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import PasswordResetToken, RefreshToken, User
from app.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    PublicClientRegister,
    RefreshTokenResponse,
    ResetPasswordRequest,
    UserOut,
)
from app.security import create_access_token, generate_secure_token, hash_password, hash_token, verify_password
from app.jobs.queue import enqueue_job
from app.services.email_service import send_password_reset_email
from app.core.time import utcnow


router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    cookie_samesite = "none" if settings.app_env == "production" else "lax"
    # Limpia la cookie de versiones anteriores cuyo Path era /auth. Evita que
    # el navegador envíe dos cookies con el mismo nombre durante la transición.
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/auth",
        secure=settings.app_env == "production",
        samesite=cookie_samesite,
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite=cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    cookie_samesite = "none" if settings.app_env == "production" else "lax"
    for cookie_path in ("/", "/auth"):
        response.delete_cookie(
            key=settings.refresh_cookie_name,
            path=cookie_path,
            secure=settings.app_env == "production",
            samesite=cookie_samesite,
        )


def _create_refresh_token(user: User, db: Session, commit: bool = True) -> str:
    raw_token = generate_secure_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    if commit:
        db.commit()
    return raw_token


def _register_password_reset_request(db: Session, email: str, user: User | None) -> None:
    """Registra una solicitud interna para que el admin la vea en la app.

    Se usa SQL plano para no depender de que el modelo ORM esté actualizado en
    instalaciones anteriores. Si la tabla todavía no existe, el flujo normal de
    recuperación no se rompe.
    """
    clean_email = email.strip().lower()
    metadata = {
        "source": "forgot_password_form",
        "known_user": bool(user),
    }

    try:
        db.execute(
            text(
                """
                insert into public.password_reset_requests (
                    user_id,
                    email,
                    user_name,
                    phone_number,
                    status,
                    requested_at,
                    metadata_json
                )
                values (
                    :user_id,
                    :email,
                    :user_name,
                    :phone_number,
                    'pending',
                    now(),
                    :metadata_json
                )
                on conflict (lower(email)) where status = 'pending'
                do update set
                    requested_at = excluded.requested_at,
                    user_id = excluded.user_id,
                    user_name = excluded.user_name,
                    phone_number = excluded.phone_number,
                    metadata_json = excluded.metadata_json
                """
            ),
            {
                "user_id": user.id if user else None,
                "email": clean_email,
                "user_name": user.name if user else None,
                "phone_number": getattr(user, "phone_number", None) if user else None,
                "metadata_json": json.dumps(metadata),
            },
        )
        db.commit()
    except Exception:
        db.rollback()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    clean_email = str(payload.email).strip().lower()
    try:
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="El acceso requiere completar una actualización pendiente de la base. Ejecuta el archivo RECUPERAR_ACCESO_ADMIN_v1.19.1.sql en Supabase.",
        ) from exc
    now = utcnow()

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
        status_messages = {
            "pending": "La cuenta está pendiente de activación.",
            "suspended": "La cuenta está suspendida. Revisa el estado de acceso en administración.",
            "rejected": "La cuenta no está habilitada para ingresar.",
        }
        raise HTTPException(status_code=403, detail=status_messages.get(user.status, "La cuenta no está activa."))

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now

    access_token = create_access_token(subject=str(user.id), token_version=user.token_version or 0)
    refresh_token = _create_refresh_token(user, db, commit=False)
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return {"access_token": access_token, "user": user}


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
    db: Session = Depends(get_db),
):
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Refresh token requerido")

    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_cookie)).first()
    if not row or row.revoked_at or row.expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    try:
        user = db.get(User, row.user_id)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="El acceso requiere completar una actualización pendiente de la base. Ejecuta el archivo RECUPERAR_ACCESO_ADMIN_v1.19.1.sql en Supabase.",
        ) from exc
    if not user or user.status != "active":
        raise HTTPException(status_code=403, detail="La cuenta no está activa.")

    row.revoked_at = utcnow()
    db.commit()
    new_refresh = _create_refresh_token(user, db)
    _set_refresh_cookie(response, new_refresh)
    return {"access_token": create_access_token(subject=str(user.id), token_version=user.token_version or 0)}


@router.post("/logout-all")
def logout_all(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.token_version = (current_user.token_version or 0) + 1
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": utcnow()})
    db.commit()
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.post("/logout")
def logout(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
    db: Session = Depends(get_db),
):
    if refresh_cookie:
        row = db.query(RefreshToken).filter(
            RefreshToken.token_hash == hash_token(refresh_cookie),
            RefreshToken.revoked_at.is_(None),
        ).first()
        if row:
            row.revoked_at = utcnow()
            db.commit()
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_email = str(payload.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    # Nueva parte: siempre registra solicitud interna para que el admin se entere.
    _register_password_reset_request(db, str(payload.email), user)

    # Respuesta genérica por seguridad: no revela si el correo existe o no.
    if not user:
        return {"detail": "Solicitud recibida. Si el correo está registrado, el equipo revisará el acceso."}

    # Se conserva el flujo de token por si luego se activa SMTP real.
    raw_token = generate_secure_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=utcnow() + timedelta(minutes=settings.password_reset_expire_minutes),
        )
    )
    db.commit()

    reset_url = f"{settings.frontend_url}/?reset_token={raw_token}"
    if not enqueue_job(send_password_reset_email, payload.email, reset_url):
        send_password_reset_email(payload.email, reset_url)

    response = {"detail": "Solicitud recibida. El equipo de Imperial Fitness revisará el acceso."}
    if settings.app_env in {"local", "test"}:
        response["reset_token_dev"] = raw_token
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == hash_token(payload.token)).first()
    if not row or row.used_at or row.expires_at < utcnow():
        raise HTTPException(status_code=400, detail="Token de recuperación inválido")

    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.password_hash = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    row.used_at = utcnow()
    db.commit()
    return {"ok": True}


def _users_table_name(db: Session) -> str:
    bind = db.get_bind()
    if bind.dialect.name == "postgresql":
        return "public.users"
    return "users"


def _available_user_columns(db: Session) -> set[str]:
    bind = db.get_bind()
    if bind.dialect.name == "sqlite":
        rows = db.execute(text("PRAGMA table_info(users)")).mappings().all()
        return {str(row.get("name")) for row in rows}

    rows = db.execute(
        text(
            "select column_name from information_schema.columns "
            "where table_schema = 'public' and table_name = 'users'"
        )
    ).mappings().all()
    return {str(row.get("column_name")) for row in rows}


def _public_register_response(row: dict, payload: PublicClientRegister, clean_email: str) -> dict:
    return {
        "id": int(row.get("id") or 0),
        "auth_user_id": row.get("auth_user_id"),
        "name": row.get("name") or payload.name,
        "email": row.get("email") or clean_email,
        "role": row.get("role") or "client",
        "status": row.get("status") or "pending",
        "avatar_url": row.get("avatar_url"),
        "assigned_trainer_id": row.get("assigned_trainer_id"),
        "tokens": int(row.get("tokens") or 0),
        "weight": row.get("weight", payload.weight),
        "height": row.get("height", payload.height),
        "age": row.get("age", payload.age),
        "gender": row.get("gender", payload.gender),
        "body_fat": row.get("body_fat"),
        "muscle_mass": row.get("muscle_mass"),
        "goal": row.get("goal", payload.goal),
        "phone_number": row.get("phone_number", payload.phone_number),
        "whatsapp_opt_in": int(row.get("whatsapp_opt_in") if row.get("whatsapp_opt_in") is not None else payload.whatsapp_opt_in),
        "pending_at": row.get("pending_at"),
        "activated_at": row.get("activated_at"),
        "suspended_at": row.get("suspended_at"),
        "status_changed_at": row.get("status_changed_at"),
        "access_note": row.get("access_note") or "",
        "created_at": row.get("created_at") or utcnow(),
    }


@router.post("/register", response_model=UserOut, status_code=201)
def register_client(payload: PublicClientRegister, db: Session = Depends(get_db)):
    clean_email = str(payload.email).strip().lower()
    clean_phone = str(payload.phone_number).strip()
    table_name = _users_table_name(db)

    try:
        exists = db.execute(
            text(f"select id from {table_name} where lower(email) = lower(:email) limit 1"),
            {"email": clean_email},
        ).mappings().first()
        if exists:
            raise HTTPException(status_code=409, detail="Ese correo ya tiene una solicitud o cuenta registrada.")

        columns = _available_user_columns(db)
        allowed_values = {
            "name": payload.name,
            "email": clean_email,
            "phone_number": clean_phone,
            "whatsapp_opt_in": int(payload.whatsapp_opt_in if payload.whatsapp_opt_in is not None else 1),
            "role": "client",
            "status": "pending",
            "password_hash": hash_password(payload.password),
            "goal": payload.goal,
            "weight": payload.weight,
            "height": payload.height,
            "age": payload.age,
            "gender": payload.gender,
            "tokens": 0,
            "pending_at": utcnow(),
            "status_changed_at": utcnow(),
            "access_note": "",
        }
        insert_values = {key: value for key, value in allowed_values.items() if key in columns}

        required = {"name", "email", "role", "status", "password_hash"}
        missing = required - set(insert_values)
        if missing:
            raise HTTPException(
                status_code=503,
                detail="No se pudo registrar la solicitud porque la tabla de usuarios no tiene la estructura mínima requerida.",
            )

        col_sql = ", ".join(insert_values.keys())
        param_sql = ", ".join(f":{key}" for key in insert_values.keys())
        db.execute(text(f"insert into {table_name} ({col_sql}) values ({param_sql})"), insert_values)
        db.commit()

        row = db.execute(
            text(f"select * from {table_name} where lower(email) = lower(:email) order by id desc limit 1"),
            {"email": clean_email},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=503, detail="La solicitud fue enviada, pero no se pudo confirmar el registro.")
        return _public_register_response(dict(row), payload, clean_email)
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ese correo ya tiene una solicitud o cuenta registrada.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="No se pudo guardar la solicitud en este momento. Intenta nuevamente en unos minutos o avisa al equipo Imperial Fitness.",
        )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
