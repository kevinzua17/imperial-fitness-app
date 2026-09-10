from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import DailyCheckin, User
from app.schemas import CheckinClientSummary, DailyCheckinCreate, DailyCheckinOut
from app.services.gamification_engine import process_daily_checkin
from app.core.time import utcnow


router = APIRouter(prefix="/checkins", tags=["checkins"])


def _today_key() -> str:
    return date.today().isoformat()


def _risk_from_score(score: int, days_without_checkin: int) -> str:
    if days_without_checkin >= 5 or score < 45:
        return "Alto"
    if days_without_checkin >= 3 or score < 70:
        return "Medio"
    return "Bajo"


@router.get("/today", response_model=DailyCheckinOut | None)
def get_today_checkin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(DailyCheckin)
        .filter(DailyCheckin.user_id == current_user.id, DailyCheckin.checkin_date == _today_key())
        .first()
    )


@router.post("/today", response_model=DailyCheckinOut)
def save_today_checkin(
    payload: DailyCheckinCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.status != "active":
        raise HTTPException(status_code=403, detail="Cuenta pendiente o inactiva")

    today = _today_key()
    row = (
        db.query(DailyCheckin)
        .filter(DailyCheckin.user_id == current_user.id, DailyCheckin.checkin_date == today)
        .first()
    )

    if not row:
        row = DailyCheckin(user_id=current_user.id, checkin_date=today)
        db.add(row)

    row.training_status = payload.training_status
    row.nutrition_status = payload.nutrition_status
    row.planned_training_time = payload.planned_training_time
    row.mood = payload.mood
    row.notes = payload.notes
    row.source = "client_app"
    row.updated_at = utcnow()

    db.commit()
    db.refresh(row)

    # Gamificación: otorga XP/rachas sin bloquear el check-in si ocurre un error secundario.
    try:
        process_daily_checkin(
            db=db,
            user_id=current_user.id,
            training_status=row.training_status,
            nutrition_status=row.nutrition_status,
            checkin_date=row.checkin_date,
        )
    except Exception:
        db.rollback()

    return row


@router.get("/me/recent", response_model=list[DailyCheckinOut])
def list_my_recent_checkins(
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = max(1, min(days, 60))
    since = (date.today() - timedelta(days=days - 1)).isoformat()
    return (
        db.query(DailyCheckin)
        .filter(DailyCheckin.user_id == current_user.id, DailyCheckin.checkin_date >= since)
        .order_by(DailyCheckin.checkin_date.desc())
        .all()
    )


@router.get("/admin/summary", response_model=list[CheckinClientSummary])
def get_checkin_summary(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    days = max(1, min(days, 45))
    since = (date.today() - timedelta(days=days - 1)).isoformat()
    today = date.today()

    client_query = db.query(User).filter(User.role == "client", User.status == "active")
    if current_user.role == "trainer":
        client_query = client_query.filter(User.assigned_trainer_id == current_user.id)
    clients = client_query.order_by(User.name.asc()).all()
    client_ids = [client.id for client in clients]

    rows: list[DailyCheckin] = []
    if client_ids:
        rows = (
            db.query(DailyCheckin)
            .filter(DailyCheckin.user_id.in_(client_ids), DailyCheckin.checkin_date >= since)
            .order_by(DailyCheckin.checkin_date.desc())
            .all()
        )

    by_client: dict[int, list[DailyCheckin]] = {}
    for row in rows:
        by_client.setdefault(row.user_id, []).append(row)

    output: list[CheckinClientSummary] = []
    for client in clients:
        history = by_client.get(client.id, [])
        latest = history[0] if history else None
        training_done = sum(1 for item in history if item.training_status == "trained")
        training_later = sum(1 for item in history if item.training_status == "later")
        training_missed = sum(1 for item in history if item.training_status == "missed")
        nutrition_completed = sum(1 for item in history if item.nutrition_status == "completed")
        nutrition_partial = sum(1 for item in history if item.nutrition_status == "partial")
        nutrition_missed = sum(1 for item in history if item.nutrition_status == "missed")

        if latest:
            last_date = date.fromisoformat(latest.checkin_date)
            days_without_checkin = max(0, (today - last_date).days)
        else:
            days_without_checkin = days

        # Score interno: entrenamiento cumplido pesa 60%, alimentación cumplida/parcial 40%.
        training_score = min(100, round((training_done / days) * 100))
        nutrition_score = min(100, round(((nutrition_completed + (nutrition_partial * 0.5)) / days) * 100))
        adherence_score = round((training_score * 0.6) + (nutrition_score * 0.4))
        risk_level = _risk_from_score(adherence_score, days_without_checkin)

        output.append(
            CheckinClientSummary(
                user_id=client.id,
                name=client.name,
                email=client.email,
                phone_number=client.phone_number,
                whatsapp_opt_in=client.whatsapp_opt_in or 0,
                assigned_trainer_id=client.assigned_trainer_id,
                last_checkin_date=latest.checkin_date if latest else None,
                last_training_status=latest.training_status if latest else None,
                last_nutrition_status=latest.nutrition_status if latest else None,
                training_done=training_done,
                training_later=training_later,
                training_missed=training_missed,
                nutrition_completed=nutrition_completed,
                nutrition_partial=nutrition_partial,
                nutrition_missed=nutrition_missed,
                days_without_checkin=days_without_checkin,
                adherence_score=adherence_score,
                risk_level=risk_level,
            )
        )

    return sorted(output, key=lambda item: (item.risk_level != "Alto", item.risk_level != "Medio", item.adherence_score))
