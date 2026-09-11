from __future__ import annotations

import json
from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.private_files import create_private_asset_access_url, private_asset_belongs_to_folder
from app.core.uploads import save_image_upload
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import User


router = APIRouter(prefix="/memberships", tags=["memberships"])

MembershipStatus = Literal[
    "trial_active",
    "active",
    "expiring_soon",
    "pending_validation",
    "overdue",
    "limited",
    "suspended",
]


class PaymentPlanSetting(BaseModel):
    id: str = Field(default="monthly", max_length=60)
    title: str = Field(default="1 mes", max_length=80)
    months: int = Field(default=1, ge=1, le=24)
    amount: int = Field(default=10000, ge=1000, le=10_000_000)
    compare_at: int | None = Field(default=None, ge=0, le=50_000_000)
    badge: str | None = Field(default=None, max_length=60)
    highlight: bool = False
    active: bool = True


class SubmitPaymentRequest(BaseModel):
    amount: int = Field(default=10000, ge=1000, le=10_000_000)
    reference: str | None = Field(default=None, max_length=160)
    receipt_url: str | None = Field(default=None, max_length=700)
    plan_id: str | None = Field(default=None, max_length=60)
    months: int = Field(default=1, ge=1, le=24)


class RejectPaymentRequest(BaseModel):
    admin_notes: str = Field(default="", max_length=800)


class ManualPaidRequest(BaseModel):
    amount: int = Field(default=10000, ge=1000, le=10_000_000)
    months: int = Field(default=1, ge=1, le=24)
    reference: str | None = Field(default="Pago registrado manualmente", max_length=160)
    admin_notes: str = Field(default="Pago validado manualmente por administración", max_length=800)


class MembershipAccountAdminUpdate(BaseModel):
    trial_started_at: date | None = None
    trial_ends_at: date | None = None
    last_payment_at: date | None = None
    next_payment_due: date | None = None
    activated_at: datetime | None = None
    pending_validation_at: datetime | None = None
    suspended_at: datetime | None = None
    status_changed_at: datetime | None = None
    manual_status: MembershipStatus | None = None
    manual_status_until: date | None = None
    status_note: str | None = Field(default=None, max_length=500)
    clear_manual_status: bool = False


class MembershipSettingsUpdate(BaseModel):
    nequi_number: str | None = Field(default=None, max_length=60)
    monthly_price: int | None = Field(default=None, ge=1000, le=10_000_000)
    payment_instructions: str | None = Field(default=None, max_length=1200)
    launch_offer_enabled: bool | None = None
    launch_offer_title: str | None = Field(default=None, max_length=120)
    launch_offer_badge: str | None = Field(default=None, max_length=80)
    launch_offer_deadline: str | None = Field(default=None, max_length=30)
    launch_spots_limit: int | None = Field(default=None, ge=0, le=100000)
    launch_spots_used: int | None = Field(default=None, ge=0, le=100000)
    payment_plans: list[PaymentPlanSetting] | None = None


def _today() -> date:
    return date.today()


def _row(row):
    return dict(row) if row else None


def _payment_for_response(row: Any) -> dict[str, Any]:
    payment = dict(row)
    payment["receipt_url"] = create_private_asset_access_url(payment.get("receipt_url"))
    return payment


def _setting(db: Session, key: str, default: str) -> str:
    row = db.execute(text("select value from public.app_settings where key = :key"), {"key": key}).mappings().first()
    return str(row["value"]) if row and row.get("value") is not None else default


def _int_setting(db: Session, key: str, default: int) -> int:
    try:
        return int(_setting(db, key, str(default)))
    except Exception:
        return default


def _bool_setting(db: Session, key: str, default: bool) -> bool:
    raw = _setting(db, key, "1" if default else "0").strip().lower()
    return raw in {"1", "true", "yes", "si", "sí", "on", "activo", "active"}


def _json_setting(db: Session, key: str, default: Any) -> Any:
    raw = _setting(db, key, json.dumps(default, ensure_ascii=False))
    try:
        return json.loads(raw)
    except Exception:
        return default


def _set_setting(db: Session, key: str, value: str) -> None:
    db.execute(
        text(
            """
            insert into public.app_settings (key, value)
            values (:key, :value)
            on conflict (key) do update set value = excluded.value, updated_at = now()
            """
        ),
        {"key": key, "value": value},
    )


def _default_payment_plans() -> list[dict]:
    return [
        {
            "id": "monthly_launch",
            "title": "1 mes Imperial",
            "months": 1,
            "amount": 10000,
            "compare_at": 49000,
            "badge": "Lanzamiento",
            "highlight": True,
            "active": True,
        },
        {
            "id": "quarterly_launch",
            "title": "3 meses Imperial",
            "months": 3,
            "amount": 30000,
            "compare_at": 147000,
            "badge": "Mejor ahorro",
            "highlight": False,
            "active": True,
        },
        {
            "id": "semester_launch",
            "title": "6 meses Imperial",
            "months": 6,
            "amount": 54000,
            "compare_at": 294000,
            "badge": "Más compromiso",
            "highlight": False,
            "active": True,
        },
    ]


def _normalize_payment_plans(raw: Any) -> list[dict]:
    plans = raw if isinstance(raw, list) else _default_payment_plans()
    clean: list[dict] = []
    for index, item in enumerate(plans[:6]):
        if not isinstance(item, dict):
            continue
        months = max(1, min(24, int(item.get("months") or 1)))
        amount = max(1000, min(10_000_000, int(item.get("amount") or 10000)))
        compare_at_raw = item.get("compare_at")
        compare_at = None
        if compare_at_raw not in {None, "", 0, "0"}:
            compare_at = max(0, min(50_000_000, int(compare_at_raw)))
        clean.append(
            {
                "id": str(item.get("id") or f"plan_{index + 1}")[:60],
                "title": str(item.get("title") or f"{months} mes(es)")[:80],
                "months": months,
                "amount": amount,
                "compare_at": compare_at,
                "badge": str(item.get("badge") or "")[:60],
                "highlight": bool(item.get("highlight")),
                "active": bool(item.get("active", True)),
            }
        )
    return clean or _default_payment_plans()


def _settings_payload(db: Session) -> dict:
    plans = _normalize_payment_plans(_json_setting(db, "membership_payment_plans_json", _default_payment_plans()))
    monthly_price = _int_setting(db, "membership_monthly_price_cop", 10000)
    if monthly_price and plans:
        plans[0]["amount"] = int(plans[0].get("amount") or monthly_price)
    return {
        "nequi_number": _setting(db, "membership_nequi_number", "CONFIGURAR_NUMERO_NEQUI"),
        "monthly_price": monthly_price,
        "currency": _setting(db, "membership_currency", "COP"),
        "trial_days": _int_setting(db, "membership_trial_days", 7),
        "grace_days": _int_setting(db, "membership_grace_days", 3),
        "suspension_days": _int_setting(db, "membership_suspension_days", 7),
        "payment_instructions": _setting(
            db,
            "membership_payment_instructions",
            "Realiza el pago por Nequi, sube el comprobante y espera validación del equipo Imperial Fitness.",
        ),
        "launch_offer_enabled": _bool_setting(db, "membership_launch_offer_enabled", True),
        "launch_offer_title": _setting(db, "membership_launch_offer_title", "Precio de lanzamiento Imperial"),
        "launch_offer_badge": _setting(db, "membership_launch_offer_badge", "Oferta activa por tiempo limitado"),
        "launch_offer_deadline": _setting(db, "membership_launch_offer_deadline", ""),
        "launch_spots_limit": _int_setting(db, "membership_launch_spots_limit", 0),
        "launch_spots_used": _int_setting(db, "membership_launch_spots_used", 0),
        "payment_plans": plans,
    }


def _add_months(value: date, months: int = 1) -> date:
    months = max(1, min(24, int(months or 1)))
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _status_from_dates(
    account: dict,
    has_pending_payment: bool,
    grace_days: int = 3,
    suspension_days: int = 7,
) -> MembershipStatus:
    today = _today()
    manual_status = account.get("manual_status")
    manual_status_until = account.get("manual_status_until")
    if isinstance(manual_status_until, str):
        manual_status_until = date.fromisoformat(manual_status_until)
    if manual_status and (manual_status_until is None or today <= manual_status_until):
        return manual_status
    if has_pending_payment:
        return "pending_validation"

    trial_ends_at = account.get("trial_ends_at")
    next_due = account.get("next_payment_due")
    last_payment = account.get("last_payment_at")

    if isinstance(trial_ends_at, str):
        trial_ends_at = date.fromisoformat(trial_ends_at)
    if isinstance(next_due, str):
        next_due = date.fromisoformat(next_due)

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


def _ensure_account(db: Session, user_id: int) -> dict:
    account = db.execute(text("select * from public.membership_accounts where user_id = :user_id"), {"user_id": user_id}).mappings().first()
    if account:
        return _refresh_account_status(db, user_id)

    user_row = db.execute(text("select id, created_at from public.users where id = :user_id"), {"user_id": user_id}).mappings().first()
    if not user_row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    settings = _settings_payload(db)
    created_at = user_row["created_at"]
    start_date = created_at.date() if hasattr(created_at, "date") else _today()
    trial_end = start_date + timedelta(days=int(settings["trial_days"]))
    billing_day = min(start_date.day, 28)

    db.execute(
        text(
            """
            insert into public.membership_accounts (
              user_id, trial_started_at, trial_ends_at, billing_day,
              monthly_price, currency, next_payment_due, status, updated_at
            ) values (
              :user_id, :trial_started_at, :trial_ends_at, :billing_day,
              :monthly_price, :currency, :next_payment_due, 'trial_active', now()
            )
            on conflict (user_id) do nothing
            """
        ),
        {
            "user_id": user_id,
            "trial_started_at": start_date,
            "trial_ends_at": trial_end,
            "billing_day": billing_day,
            "monthly_price": settings["monthly_price"],
            "currency": settings["currency"],
            "next_payment_due": trial_end,
        },
    )
    db.commit()
    return _refresh_account_status(db, user_id)


def _ensure_accounts_for_all_clients(db: Session) -> None:
    settings = _settings_payload(db)
    db.execute(
        text(
            """
            insert into public.membership_accounts (
              user_id, trial_started_at, trial_ends_at, billing_day,
              monthly_price, currency, next_payment_due, status, updated_at
            )
            select
              u.id,
              coalesce(u.created_at::date, current_date),
              (coalesce(u.created_at::date, current_date) + (:trial_days || ' days')::interval)::date,
              least(extract(day from coalesce(u.created_at::date, current_date))::integer, 28),
              :monthly_price,
              :currency,
              (coalesce(u.created_at::date, current_date) + (:trial_days || ' days')::interval)::date,
              case
                when current_date <= (coalesce(u.created_at::date, current_date) + (:trial_days || ' days')::interval)::date then 'trial_active'
                else 'overdue'
              end,
              now()
            from public.users u
            left join public.membership_accounts ma on ma.user_id = u.id
            where u.role = 'client' and ma.user_id is null
            """
        ),
        {"trial_days": int(settings["trial_days"]), "monthly_price": int(settings["monthly_price"]), "currency": settings["currency"]},
    )


def _refresh_account_status(db: Session, user_id: int) -> dict:
    account = db.execute(text("select * from public.membership_accounts where user_id = :user_id"), {"user_id": user_id}).mappings().first()
    if not account:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    account = dict(account)

    manual_until = account.get("manual_status_until")
    if isinstance(manual_until, str):
        manual_until = date.fromisoformat(manual_until)
    if account.get("manual_status") and manual_until and manual_until < _today():
        db.execute(
            text("update public.membership_accounts set manual_status = null, manual_status_until = null, updated_at = now() where user_id = :user_id"),
            {"user_id": user_id},
        )
        db.commit()
        account["manual_status"] = None
        account["manual_status_until"] = None

    pending = db.execute(
        text("select count(*) as total from public.membership_payments where user_id = :user_id and status = 'pending'"),
        {"user_id": user_id},
    ).mappings().first()
    has_pending = int(pending["total"] or 0) > 0
    settings = _settings_payload(db)
    new_status = _status_from_dates(account, has_pending, int(settings.get("grace_days", 3)), int(settings.get("suspension_days", 7)))

    if new_status != account.get("status"):
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
            {"status": new_status, "user_id": user_id},
        )
        db.commit()
        refreshed = db.execute(
            text("select * from public.membership_accounts where user_id = :user_id"),
            {"user_id": user_id},
        ).mappings().first()
        if refreshed:
            account = dict(refreshed)

    return account


def _refresh_all_membership_statuses(db: Session) -> None:
    settings = _settings_payload(db)
    grace_days = int(settings.get("grace_days", 3))
    suspension_days = int(settings.get("suspension_days", 7))
    db.execute(
        text(
            """
            update public.membership_accounts
            set manual_status = null, manual_status_until = null, updated_at = now()
            where manual_status is not null
              and manual_status_until is not null
              and manual_status_until < current_date
            """
        )
    )
    db.execute(
        text(
            """
            update public.membership_accounts ma
            set status = computed.new_status,
                limited_at = case when computed.new_status = 'limited' and ma.limited_at is null then now() else ma.limited_at end,
                suspended_at = case when computed.new_status = 'suspended' and ma.suspended_at is null then now() else ma.suspended_at end,
                updated_at = now()
            from (
              select ma2.user_id,
                case
                  when ma2.manual_status is not null and (ma2.manual_status_until is null or current_date <= ma2.manual_status_until) then ma2.manual_status
                  when exists (select 1 from public.membership_payments p where p.user_id = ma2.user_id and p.status = 'pending') then 'pending_validation'
                  when ma2.last_payment_at is null and ma2.trial_ends_at is not null and current_date <= ma2.trial_ends_at then 'trial_active'
                  when ma2.next_payment_due is null then 'overdue'
                  when (ma2.next_payment_due - current_date) >= 4 then 'active'
                  when (ma2.next_payment_due - current_date) between 0 and 3 then 'expiring_soon'
                  when (current_date - ma2.next_payment_due) between 1 and :grace_days then 'overdue'
                  when (current_date - ma2.next_payment_due) between (:grace_days + 1) and :suspension_days then 'limited'
                  else 'suspended'
                end as new_status
              from public.membership_accounts ma2
            ) computed
            where ma.user_id = computed.user_id and ma.status is distinct from computed.new_status
            """
        ),
        {"grace_days": grace_days, "suspension_days": suspension_days},
    )


def _days_to_due(account: dict) -> dict:
    due = account.get("next_payment_due")
    if isinstance(due, str):
        due = date.fromisoformat(due)
    if not due:
        return {"days_to_due": None, "days_past_due": None}
    diff = (due - _today()).days
    return {"days_to_due": diff if diff >= 0 else 0, "days_past_due": abs(diff) if diff < 0 else 0}


def _is_restricted_status(status: str | None) -> bool:
    return status in {"pending_validation", "limited", "suspended"}


def _membership_access(account: dict) -> dict:
    status = account.get("status")
    days = _days_to_due(account)
    restricted = _is_restricted_status(status)
    return {
        "feature_limited": restricted,
        "restricted_access": restricted,
        "payment_required": status in {"limited", "suspended"},
        "premium_modules_blocked": restricted,
        "allowed_client_tabs": ["membership", "profile"],
        **days,
    }


def _notices(account: dict, settings: dict) -> list[dict]:
    today = _today()
    status = account.get("status")
    due = account.get("next_payment_due")
    if isinstance(due, str):
        due = date.fromisoformat(due)

    notices: list[dict] = []
    price = f"${int(settings['monthly_price']):,}".replace(",", ".")

    if status == "trial_active" and due:
        days = (due - today).days
        if days <= 3:
            title = "Tu período gratuito termina pronto" if days > 0 else "Tu período gratuito vence hoy"
            notices.append({"type": "warning" if days <= 1 else "info", "title": title, "message": f"Activa tu membresía desde {price} y conserva tu acceso completo."})
    elif status == "expiring_soon" and due:
        days = max(0, (due - today).days)
        notices.append({"type": "warning", "title": f"Tu membresía vence en {days} día(s)", "message": "Sube tu comprobante para evitar limitaciones en la cuenta."})
    elif status == "overdue":
        notices.append({"type": "warning", "title": "Membresía vencida", "message": "Regulariza tu pago antes de que el acceso premium sea limitado."})
    elif status == "limited":
        notices.append({"type": "danger", "title": "Acceso premium limitado", "message": "Sube tu comprobante de pago para recuperar el acceso completo."})
    elif status == "suspended":
        notices.append({"type": "danger", "title": "Cuenta suspendida temporalmente", "message": "Regulariza tu pago desde Pagos o contacta al equipo Imperial Fitness para reactivar el acceso."})
    elif status == "pending_validation":
        notices.append({"type": "info", "title": "Comprobante en revisión", "message": "El equipo Imperial validará tu pago. Mientras tanto, tu comprobante permanece en revisión."})

    return notices


@router.get("/me")
def get_my_membership(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        return {"account": None, "payments": [], "settings": _settings_payload(db), "notices": []}

    account = _ensure_account(db, current_user.id)
    settings = _settings_payload(db)
    payments = db.execute(
        text(
            """
            select id, amount, currency, method, reference, receipt_url, status,
                   period_start, period_end, submitted_at, reviewed_at, admin_notes,
                   coalesce(months_paid, 1) as months_paid, plan_id
            from public.membership_payments
            where user_id = :user_id
            order by submitted_at desc
            limit 12
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    access = _membership_access(account)
    return {"account": account, "payments": [_payment_for_response(row) for row in payments], "settings": settings, "notices": _notices(account, settings), **access}


@router.post("/me/payments/upload")
async def upload_payment_receipt(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Solo clientes pueden subir comprobantes")
    reference = await save_image_upload(file, f"payment-receipts-user-{current_user.id}", private=True)
    return {"receipt_url": reference}


@router.post("/me/payments")
def submit_payment(payload: SubmitPaymentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Solo clientes pueden reportar pagos")
    account = _ensure_account(db, current_user.id)
    settings = _settings_payload(db)
    valid_plan = next((plan for plan in settings.get("payment_plans", []) if plan.get("id") == payload.plan_id), None)
    months = int(valid_plan.get("months") if valid_plan else payload.months or 1)
    amount = int(valid_plan.get("amount") if valid_plan else payload.amount or account.get("monthly_price") or settings["monthly_price"])
    plan_id = str(valid_plan.get("id") if valid_plan else (payload.plan_id or "custom"))[:60]
    receipt_reference = (payload.receipt_url or "").strip()
    expected_folder = f"payment-receipts-user-{current_user.id}"
    if not private_asset_belongs_to_folder(receipt_reference, expected_folder):
        raise HTTPException(status_code=400, detail="Sube el comprobante desde el cargador privado antes de reportar el pago.")
    duplicate_receipt = db.execute(
        text("select id from public.membership_payments where user_id = :user_id and receipt_url = :receipt_url limit 1"),
        {"user_id": current_user.id, "receipt_url": receipt_reference},
    ).first()
    if duplicate_receipt:
        raise HTTPException(status_code=409, detail="Este comprobante ya fue reportado anteriormente.")

    db.execute(
        text(
            """
            insert into public.membership_payments
              (user_id, amount, currency, method, reference, receipt_url, status, submitted_at, months_paid, plan_id)
            values
              (:user_id, :amount, :currency, 'nequi', :reference, :receipt_url, 'pending', now(), :months_paid, :plan_id)
            """
        ),
        {"user_id": current_user.id, "amount": amount, "currency": settings["currency"], "reference": payload.reference or "", "receipt_url": receipt_reference, "months_paid": months, "plan_id": plan_id},
    )
    db.execute(text("update public.membership_accounts set status = 'pending_validation', pending_validation_at = now(), status_changed_at = now(), manual_status = null, manual_status_until = null, updated_at = now() where user_id = :user_id"), {"user_id": current_user.id})
    db.commit()
    return {"ok": True, "detail": "Comprobante recibido. Queda pendiente de validación administrativa."}


@router.get("/admin/settings")
def get_admin_membership_settings(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return _settings_payload(db)


@router.get("/admin/overview")
def admin_membership_overview(
    limit: int = Query(default=600, ge=1, le=1000),
    offset: int = Query(default=0, ge=0, le=100000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    _ensure_accounts_for_all_clients(db)
    _refresh_all_membership_statuses(db)
    db.commit()

    rows = db.execute(
        text(
            """
            with client_rows as (
              select id, name, email, phone_number, whatsapp_opt_in, created_at
              from public.users
              where role = 'client'
              order by name asc
              limit :limit offset :offset
            ),
            pending_counts as (
              select user_id, count(*)::int as pending_payments
              from public.membership_payments
              where status = 'pending'
              group by user_id
            )
            select
              c.id, c.name, c.email, c.phone_number, c.whatsapp_opt_in, c.created_at,
              ma.user_id, ma.trial_started_at, ma.trial_ends_at, ma.billing_day, ma.monthly_price,
              ma.currency, ma.last_payment_at, ma.next_payment_due, ma.grace_until, ma.status, ma.updated_at,
              ma.activated_at, ma.pending_validation_at, ma.suspended_at, ma.status_changed_at,
              ma.manual_status, ma.manual_status_until, ma.status_note,
              coalesce(pc.pending_payments, 0) as pending_payments,
              lp.id as last_payment_id, lp.amount as last_payment_amount, lp.currency as last_payment_currency,
              lp.status as last_payment_status, lp.receipt_url as last_payment_receipt_url,
              lp.submitted_at as last_payment_submitted_at, lp.reviewed_at as last_payment_reviewed_at,
              coalesce(lp.months_paid, 1) as last_payment_months_paid, lp.plan_id as last_payment_plan_id
            from client_rows c
            join public.membership_accounts ma on ma.user_id = c.id
            left join pending_counts pc on pc.user_id = c.id
            left join lateral (
              select id, amount, currency, status, receipt_url, submitted_at, reviewed_at, months_paid, plan_id
              from public.membership_payments p
              where p.user_id = c.id
              order by submitted_at desc
              limit 1
            ) lp on true
            order by c.name asc
            """
        ),
        {"limit": limit, "offset": offset},
    ).mappings().all()

    output = []
    for row in rows:
        last_payment = None
        if row.get("last_payment_id"):
            last_payment = {
                "id": row["last_payment_id"],
                "amount": row["last_payment_amount"],
                "currency": row["last_payment_currency"],
                "status": row["last_payment_status"],
                "receipt_url": create_private_asset_access_url(row["last_payment_receipt_url"]),
                "submitted_at": row["last_payment_submitted_at"],
                "reviewed_at": row["last_payment_reviewed_at"],
                "months_paid": row["last_payment_months_paid"],
                "plan_id": row["last_payment_plan_id"],
            }
        output.append(
            {
                "user": {"id": row["id"], "name": row["name"], "email": row["email"], "phone_number": row["phone_number"], "whatsapp_opt_in": row["whatsapp_opt_in"], "created_at": row["created_at"]},
                "account": {
                    "user_id": row["user_id"], "trial_started_at": row["trial_started_at"], "trial_ends_at": row["trial_ends_at"],
                    "billing_day": row["billing_day"], "monthly_price": row["monthly_price"], "currency": row["currency"],
                    "last_payment_at": row["last_payment_at"], "next_payment_due": row["next_payment_due"], "grace_until": row["grace_until"],
                    "status": row["status"], "updated_at": row["updated_at"], "activated_at": row["activated_at"],
                    "pending_validation_at": row["pending_validation_at"], "suspended_at": row["suspended_at"],
                    "status_changed_at": row["status_changed_at"], "manual_status": row["manual_status"],
                    "manual_status_until": row["manual_status_until"], "status_note": row["status_note"] or "",
                },
                "last_payment": last_payment,
                "pending_payments": int(row["pending_payments"] or 0),
            }
        )
    return output


@router.get("/admin/pending-payments")
def admin_pending_payments(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rows = db.execute(
        text(
            """
            select p.id, p.user_id, u.name, u.email, u.phone_number, u.whatsapp_opt_in,
                   p.amount, p.currency, p.method, p.reference, p.receipt_url, p.status, p.submitted_at,
                   coalesce(p.months_paid, 1) as months_paid, p.plan_id
            from public.membership_payments p
            join public.users u on u.id = p.user_id
            where p.status = 'pending'
            order by p.submitted_at asc
            limit 500
            """
        )
    ).mappings().all()
    return [_payment_for_response(row) for row in rows]


def _approve_payment(db: Session, payment_id: int, admin_id: int, notes: str = "") -> dict:
    payment = db.execute(text("select * from public.membership_payments where id = :id"), {"id": payment_id}).mappings().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="El pago ya fue revisado")

    account = _ensure_account(db, payment["user_id"])
    settings = _settings_payload(db)
    today = _today()
    current_due = account.get("next_payment_due")
    if isinstance(current_due, str):
        current_due = date.fromisoformat(current_due)
    base_due = current_due if current_due and current_due >= today else today
    months_paid = max(1, min(24, int(payment.get("months_paid") or 1)))
    new_due = _add_months(base_due, months_paid)

    db.execute(
        text(
            """
            update public.membership_payments
            set status = 'approved', reviewed_at = now(), reviewed_by = :admin_id,
                period_start = :period_start, period_end = :period_end, admin_notes = :notes
            where id = :id
            """
        ),
        {"id": payment_id, "admin_id": admin_id, "period_start": base_due, "period_end": new_due, "notes": notes},
    )
    db.execute(
        text(
            """
            update public.membership_accounts
            set last_payment_at = :today,
                next_payment_due = :new_due,
                monthly_price = :amount,
                currency = :currency,
                status = 'active',
                activated_at = now(),
                status_changed_at = now(),
                manual_status = null,
                manual_status_until = null,
                limited_at = null,
                suspended_at = null,
                updated_at = now()
            where user_id = :user_id
            """
        ),
        {"today": today, "new_due": new_due, "amount": int(settings.get("monthly_price") or payment["amount"]), "currency": payment["currency"], "user_id": payment["user_id"]},
    )
    db.commit()
    return {"ok": True, "next_payment_due": new_due.isoformat(), "months_paid": months_paid}


@router.post("/admin/payments/{payment_id}/approve")
def approve_membership_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return _approve_payment(db, payment_id, current_user.id, "Pago aprobado por administración")


@router.post("/admin/payments/{payment_id}/reject")
def reject_membership_payment(payment_id: int, payload: RejectPaymentRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    payment = db.execute(text("select * from public.membership_payments where id = :id"), {"id": payment_id}).mappings().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    db.execute(
        text(
            """
            update public.membership_payments
            set status = 'rejected', reviewed_at = now(), reviewed_by = :admin_id, admin_notes = :notes
            where id = :id
            """
        ),
        {"id": payment_id, "admin_id": current_user.id, "notes": payload.admin_notes},
    )
    _refresh_account_status(db, payment["user_id"])
    db.commit()
    return {"ok": True}


@router.post("/admin/accounts/{user_id}/mark-paid")
def mark_membership_paid_manually(user_id: int, payload: ManualPaidRequest, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    account = _ensure_account(db, user_id)
    settings = _settings_payload(db)
    result = db.execute(
        text(
            """
            insert into public.membership_payments
              (user_id, amount, currency, method, reference, status, submitted_at, months_paid, plan_id)
            values
              (:user_id, :amount, :currency, 'manual', :reference, 'pending', now(), :months_paid, 'manual')
            returning id
            """
        ),
        {"user_id": user_id, "amount": payload.amount or account.get("monthly_price") or settings["monthly_price"], "currency": settings["currency"], "reference": payload.reference or "Pago manual", "months_paid": payload.months},
    ).mappings().first()
    db.commit()
    return _approve_payment(db, int(result["id"]), current_user.id, payload.admin_notes)


@router.patch("/admin/accounts/{user_id}")
def update_membership_account(
    user_id: int,
    payload: MembershipAccountAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    account = _ensure_account(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    clear_manual = bool(data.pop("clear_manual_status", False))

    trial_start = data.get("trial_started_at", account.get("trial_started_at"))
    trial_end = data.get("trial_ends_at", account.get("trial_ends_at"))
    if trial_start and trial_end and trial_end < trial_start:
        raise HTTPException(status_code=400, detail="La fecha final de prueba no puede ser anterior al inicio.")
    if "next_payment_due" in data and data["next_payment_due"] is None:
        raise HTTPException(status_code=400, detail="La fecha de próximo pago no puede quedar vacía.")

    allowed = {
        "trial_started_at", "trial_ends_at", "last_payment_at", "next_payment_due",
        "activated_at", "pending_validation_at", "suspended_at", "status_changed_at",
        "manual_status", "manual_status_until", "status_note",
    }
    updates = {key: value for key, value in data.items() if key in allowed}
    if clear_manual:
        updates["manual_status"] = None
        updates["manual_status_until"] = None

    if updates:
        assignments = [f"{key} = :{key}" for key in updates]
        if updates.get("manual_status"):
            assignments.append("status = :effective_status")
            updates["effective_status"] = updates["manual_status"]
            if "status_changed_at" not in updates:
                assignments.append("status_changed_at = now()")
        assignments.append("updated_at = now()")
        updates["user_id"] = user_id
        db.execute(text(f"update public.membership_accounts set {', '.join(assignments)} where user_id = :user_id"), updates)
        db.execute(
            text(
                """
                update public.membership_accounts
                set status_changed_at = coalesce(status_changed_at, now()),
                    activated_at = case
                      when status in ('active', 'expiring_soon') then coalesce(activated_at, status_changed_at, now())
                      else activated_at
                    end,
                    pending_validation_at = case
                      when status = 'pending_validation' then coalesce(pending_validation_at, status_changed_at, now())
                      else pending_validation_at
                    end,
                    suspended_at = case
                      when status = 'suspended' then coalesce(suspended_at, status_changed_at, now())
                      else suspended_at
                    end
                where user_id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        db.commit()

    refreshed = _refresh_account_status(db, user_id)
    return refreshed


@router.patch("/admin/settings")
def update_membership_settings(payload: MembershipSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if payload.nequi_number is not None:
        _set_setting(db, "membership_nequi_number", payload.nequi_number)
    if payload.monthly_price is not None:
        _set_setting(db, "membership_monthly_price_cop", str(payload.monthly_price))
    if payload.payment_instructions is not None:
        _set_setting(db, "membership_payment_instructions", payload.payment_instructions)
    if payload.launch_offer_enabled is not None:
        _set_setting(db, "membership_launch_offer_enabled", "1" if payload.launch_offer_enabled else "0")
    if payload.launch_offer_title is not None:
        _set_setting(db, "membership_launch_offer_title", payload.launch_offer_title)
    if payload.launch_offer_badge is not None:
        _set_setting(db, "membership_launch_offer_badge", payload.launch_offer_badge)
    if payload.launch_offer_deadline is not None:
        _set_setting(db, "membership_launch_offer_deadline", payload.launch_offer_deadline)
    if payload.launch_spots_limit is not None:
        _set_setting(db, "membership_launch_spots_limit", str(payload.launch_spots_limit))
    if payload.launch_spots_used is not None:
        _set_setting(db, "membership_launch_spots_used", str(payload.launch_spots_used))
    if payload.payment_plans is not None:
        plans = [plan.model_dump() for plan in payload.payment_plans]
        _set_setting(db, "membership_payment_plans_json", json.dumps(_normalize_payment_plans(plans), ensure_ascii=False))
    db.commit()
    return _settings_payload(db)
