from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Expense, Membership, Payment, User
from app.schemas import ExpenseCreate, ExpenseOut, MembershipCreate, MembershipOut, PaymentCreate, PaymentOut


router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary")
def finance_summary(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    now = datetime.utcnow()
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