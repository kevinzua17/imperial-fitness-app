from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import AttendanceLog, BodyMetric, CommunityPost, DailyCheckin, Expense, Membership, Payment, User, WorkoutSetLog
from app.schemas import ExpenseCreate, ExpenseOut, MembershipCreate, MembershipOut, PaymentCreate, PaymentOut
from app.core.time import utcnow


router = APIRouter(prefix="/finance", tags=["finance"])


def _month_key(value: datetime) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _shift_month(value: datetime, months: int) -> datetime:
    total = value.year * 12 + value.month - 1 + months
    return datetime(total // 12, total % 12 + 1, 1)


def _latest_activity_by_user(db: Session) -> dict[int, datetime]:
    latest: dict[int, datetime] = {
        user_id: last_login_at
        for user_id, last_login_at in db.query(User.id, User.last_login_at).filter(User.last_login_at.is_not(None)).all()
        if last_login_at
    }
    sources = [
        (DailyCheckin, DailyCheckin.user_id, DailyCheckin.updated_at),
        (AttendanceLog, AttendanceLog.user_id, AttendanceLog.checked_at),
        (CommunityPost, CommunityPost.author_id, CommunityPost.created_at),
        (WorkoutSetLog, WorkoutSetLog.user_id, WorkoutSetLog.created_at),
        # Para mediciones InBody cargadas tarde, la actividad real en la app es recorded_at.
        (BodyMetric, BodyMetric.user_id, func.coalesce(BodyMetric.recorded_at, BodyMetric.created_at)),
    ]
    for model, user_field, date_field in sources:
        for user_id, last_at in db.query(user_field, func.max(date_field)).group_by(user_field).all():
            if last_at and (user_id not in latest or last_at > latest[user_id]):
                latest[user_id] = last_at
    return latest


def _production_membership_tables_available(db: Session) -> bool:
    try:
        inspector = inspect(db.bind)
        if db.bind.dialect.name == "postgresql":
            return inspector.has_table("membership_accounts", schema="public") and inspector.has_table("membership_payments", schema="public")
        return inspector.has_table("membership_accounts") and inspector.has_table("membership_payments")
    except Exception:
        return False


@router.get("/analytics")
def finance_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    now = utcnow()
    month_start = datetime(now.year, now.month, 1)
    previous_start = _shift_month(month_start, -1)
    six_month_start = _shift_month(month_start, -5)

    clients = db.query(User).filter(User.role == "client").all()
    activity = _latest_activity_by_user(db)
    engagement = {"active_7d": 0, "at_risk_8_30d": 0, "inactive_30d": 0, "never_active": 0}
    inactive_users = []
    for user in clients:
        last_at = activity.get(user.id)
        if not last_at:
            engagement["never_active"] += 1
            inactive_users.append({"user_id": user.id, "name": user.name, "days_inactive": None})
            continue
        days = max(0, (now - last_at).days)
        if days <= 7:
            engagement["active_7d"] += 1
        elif days <= 30:
            engagement["at_risk_8_30d"] += 1
            inactive_users.append({"user_id": user.id, "name": user.name, "days_inactive": days})
        else:
            engagement["inactive_30d"] += 1
            inactive_users.append({"user_id": user.id, "name": user.name, "days_inactive": days})

    revenue_rows: list[tuple[float, datetime]] = []
    membership_status = {"active": 0, "trial": 0, "pending": 0, "overdue": 0, "limited": 0, "suspended": 0}
    expected_monthly = 0.0
    lost_revenue = 0.0
    revenue_source = "legacy_finance"

    if _production_membership_tables_available(db):
        revenue_source = "membership_payments"
        prefix = "public." if db.bind.dialect.name == "postgresql" else ""
        rows = db.execute(text(f"""
            select amount, coalesce(reviewed_at, submitted_at) as paid_at
            from {prefix}membership_payments
            where status = 'approved' and coalesce(reviewed_at, submitted_at) >= :since
        """), {"since": six_month_start}).mappings().all()
        revenue_rows = [(float(row["amount"] or 0), row["paid_at"]) for row in rows if row["paid_at"]]
        accounts = db.execute(text(f"select status, monthly_price from {prefix}membership_accounts")).mappings().all()
        for row in accounts:
            status = str(row["status"] or "")
            price = float(row["monthly_price"] or 0)
            if status in {"active", "expiring_soon"}:
                membership_status["active"] += 1
                expected_monthly += price
            elif status == "trial_active":
                membership_status["trial"] += 1
            elif status == "pending_validation":
                membership_status["pending"] += 1
            elif status == "overdue":
                membership_status["overdue"] += 1
                lost_revenue += price
            elif status == "limited":
                membership_status["limited"] += 1
                lost_revenue += price
            elif status == "suspended":
                membership_status["suspended"] += 1
                lost_revenue += price
    else:
        rows = db.query(Payment.amount, Payment.paid_at).filter(Payment.status == "paid", Payment.paid_at >= six_month_start).all()
        revenue_rows = [(float(amount or 0), paid_at) for amount, paid_at in rows if paid_at]
        memberships = db.query(Membership).all()
        for row in memberships:
            if row.status == "active" and row.ends_at >= now:
                membership_status["active"] += 1
            elif row.status != "active" or row.ends_at < now:
                membership_status["overdue"] += 1

    series_keys = [_month_key(_shift_month(month_start, offset)) for offset in range(-5, 1)]
    revenue_by_month = {key: 0.0 for key in series_keys}
    for amount, paid_at in revenue_rows:
        key = _month_key(paid_at)
        if key in revenue_by_month:
            revenue_by_month[key] += amount

    expenses = db.query(Expense.amount, Expense.spent_at).filter(Expense.spent_at >= six_month_start).all()
    expenses_by_month = {key: 0.0 for key in series_keys}
    for amount, spent_at in expenses:
        key = _month_key(spent_at)
        if key in expenses_by_month:
            expenses_by_month[key] += float(amount or 0)

    current_key = _month_key(month_start)
    previous_key = _month_key(previous_start)
    current_income = revenue_by_month.get(current_key, 0.0)
    previous_income = revenue_by_month.get(previous_key, 0.0)
    change_pct = 0.0 if previous_income == 0 else ((current_income - previous_income) / previous_income) * 100
    current_expenses = expenses_by_month.get(current_key, 0.0)
    current_sales = [(amount, paid_at) for amount, paid_at in revenue_rows if paid_at >= month_start]
    sale_days = {paid_at.date() for _, paid_at in current_sales}
    elapsed_days = max(1, now.day)
    no_sales_days_month = max(0, elapsed_days - len(sale_days))
    last_sale_at = max((paid_at for _, paid_at in revenue_rows), default=None)
    days_since_last_sale = (now.date() - last_sale_at.date()).days if last_sale_at else None
    average_ticket = (sum(amount for amount, _ in current_sales) / len(current_sales)) if current_sales else 0.0

    acquisition = []
    for key in series_keys:
        year, month = map(int, key.split("-"))
        start = datetime(year, month, 1)
        end = _shift_month(start, 1)
        acquisition.append({
            "month": key,
            "new_clients": db.query(User).filter(User.role == "client", User.created_at >= start, User.created_at < end).count(),
        })

    return {
        "generated_at": now.isoformat(),
        "engagement": {**engagement, "total_clients": len(clients)},
        "inactive_users": sorted(inactive_users, key=lambda item: item["days_inactive"] if item["days_inactive"] is not None else 9999, reverse=True)[:20],
        "membership_status": membership_status,
        "financial": {
            "income_month": round(current_income, 2),
            "income_previous_month": round(previous_income, 2),
            "income_change_percent": round(change_pct, 1),
            "expenses_month": round(current_expenses, 2),
            "net_month": round(current_income - current_expenses, 2),
            "expected_monthly_revenue": round(expected_monthly, 2),
            "at_risk_or_lost_revenue": round(lost_revenue, 2),
            "sales_count_month": len(current_sales),
            "average_ticket_month": round(average_ticket, 2),
            "last_sale_at": last_sale_at.isoformat() if last_sale_at else None,
            "days_since_last_sale": days_since_last_sale,
            "no_sales_days_month": no_sales_days_month,
            "source": revenue_source,
        },
        "monthly_series": [
            {"month": key, "income": round(revenue_by_month[key], 2), "expenses": round(expenses_by_month[key], 2)}
            for key in series_keys
        ],
        "client_acquisition": acquisition,
    }


@router.get("/summary")
def finance_summary(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    now = utcnow()
    month_start = datetime(now.year, now.month, 1)
    next_30 = now + timedelta(days=30)
    income_month = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.paid_at >= month_start, Payment.status == "paid").scalar() or 0
    expenses_month = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.spent_at >= month_start).scalar() or 0
    active_memberships = db.query(Membership).filter(Membership.status == "active", Membership.ends_at >= now).count()
    expiring_soon = db.query(Membership).filter(Membership.status == "active", Membership.ends_at <= next_30, Membership.ends_at >= now).count()
    return {
        "income_month": income_month,
        "expenses_month": expenses_month,
        "net_month": income_month - expenses_month,
        "active_memberships": active_memberships,
        "expiring_soon": expiring_soon,
    }


@router.post("/payments", response_model=PaymentOut)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=list[PaymentOut])
def list_payments(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Payment).order_by(Payment.paid_at.desc()).limit(200).all()


@router.post("/memberships", response_model=MembershipOut)
def create_membership(payload: MembershipCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    membership = Membership(**payload.model_dump())
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.get("/memberships", response_model=list[MembershipOut])
def list_memberships(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Membership).order_by(Membership.ends_at.desc()).limit(200).all()


@router.post("/expenses", response_model=ExpenseOut)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/expenses", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Expense).order_by(Expense.spent_at.desc()).limit(200).all()
