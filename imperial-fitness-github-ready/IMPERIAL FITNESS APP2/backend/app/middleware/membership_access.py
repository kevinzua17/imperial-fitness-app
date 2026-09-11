from __future__ import annotations

from datetime import date

from jose import JWTError
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.database import SessionLocal
from app.security import decode_access_token_payload


PREMIUM_PREFIXES = (
    "/nutrition",
    "/routines",
    "/progress",
    "/community",
    "/chat",
    "/checkins",
    "/gamification",
    "/history",
    "/rewards",
    "/stats",
    "/challenges",
    "/specialist",
)

ALWAYS_ALLOWED_PREFIXES = (
    "/auth",
    "/memberships",
    "/health",
    "/metrics",
    "/uploads",
    "/docs",
    "/openapi.json",
    "/users/me",
)


def _parse_date(value):
    if not value:
        return None
    if hasattr(value, "date"):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _membership_status(account: dict, has_pending_payment: bool, grace_days: int = 3, suspension_days: int = 7) -> str:
    today = date.today()
    if has_pending_payment:
        return "pending_validation"

    trial_ends_at = _parse_date(account.get("trial_ends_at"))
    next_due = _parse_date(account.get("next_payment_due"))
    last_payment = account.get("last_payment_at")

    if not last_payment and trial_ends_at and today <= trial_ends_at:
        return "trial_active"

    if not next_due:
        return "overdue"

    days_to_due = (next_due - today).days
    days_past_due = (today - next_due).days

    if days_to_due >= 4:
        return "active"
    if 0 <= days_to_due <= 3:
        return "expiring_soon"
    if 1 <= days_past_due <= max(0, grace_days):
        return "overdue"
    if max(0, grace_days) < days_past_due <= max(grace_days + 1, suspension_days):
        return "limited"
    return "suspended"


class MembershipAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if request.method == "OPTIONS":
            return await call_next(request)

        if not path.startswith(PREMIUM_PREFIXES) or path.startswith(ALWAYS_ALLOWED_PREFIXES):
            return await call_next(request)

        authorization = request.headers.get("authorization") or ""
        if not authorization.lower().startswith("bearer "):
            return await call_next(request)

        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = decode_access_token_payload(token)
            user_id = int(payload.get("sub"))
        except (JWTError, TypeError, ValueError):
            return await call_next(request)

        db = SessionLocal()
        try:
            if db.bind is not None and db.bind.dialect.name == 'sqlite':
                return await call_next(request)

            user = db.execute(
                text("select id, role, status from public.users where id = :id"),
                {"id": user_id},
            ).mappings().first()
            if not user or user.get("role") != "client" or user.get("status") != "active":
                return await call_next(request)

            account = db.execute(
                text("select * from public.membership_accounts where user_id = :user_id"),
                {"user_id": user_id},
            ).mappings().first()
            if not account:
                return await call_next(request)

            pending = db.execute(
                text("select count(*) as total from public.membership_payments where user_id = :user_id and status = 'pending'"),
                {"user_id": user_id},
            ).mappings().first()

            grace_days = db.execute(
                text("select value from public.app_settings where key = 'membership_grace_days'"),
            ).mappings().first()
            suspension_days = db.execute(
                text("select value from public.app_settings where key = 'membership_suspension_days'"),
            ).mappings().first()

            status = _membership_status(
                dict(account),
                bool(int((pending or {}).get("total") or 0)),
                grace_days=int((grace_days or {}).get("value") or 3),
                suspension_days=int((suspension_days or {}).get("value") or 7),
            )

            if status != account.get("status"):
                db.execute(
                    text(
                        """
                        update public.membership_accounts
                        set status = :status,
                            limited_at = case when :status = 'limited' and limited_at is null then now() else limited_at end,
                            suspended_at = case when :status = 'suspended' and suspended_at is null then now() else suspended_at end,
                            updated_at = now()
                        where user_id = :user_id
                        """
                    ),
                    {"status": status, "user_id": user_id},
                )
                db.commit()

            if status in {"pending_validation", "limited", "suspended"}:
                return JSONResponse(
                    status_code=402,
                    content={
                        "detail": "Tu membresía requiere validación o regularización para usar este módulo.",
                        "membership_status": status,
                        "redirect_tab": "membership",
                    },
                )
        finally:
            db.close()

        return await call_next(request)
