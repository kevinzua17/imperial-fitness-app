from datetime import date as dt_date, datetime, time, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import BodyMetric, CommunityPost, DailyCheckin, PostComment, PostReaction, ProgressPhoto, User
from app.core.time import utcnow


router = APIRouter(prefix="/history", tags=["history"])

PeriodFilter = Literal["7d", "30d", "60d", "90d", "all", "custom"]

VISIBILITY_LABELS = {
    "public": "Comunidad",
    "friends": "Solo amigos",
    "staff": "Entrenador/Admin",
    "private": "Privado",
}



def _date_window(
    period: PeriodFilter | None,
    start_date: dt_date | None,
    end_date: dt_date | None,
) -> tuple[datetime | None, datetime | None, dt_date | None, dt_date | None]:
    """
    Devuelve un rango cerrado por fecha para filtrar historial sin cargar todo.
    end_dt se maneja como exclusivo para consultas datetime.
    """
    clean_period = period or "30d"
    today = utcnow().date()
    if clean_period == "all" and not start_date and not end_date:
        return None, None, None, None

    if start_date:
        start = start_date
    elif clean_period == "custom":
        start = today - timedelta(days=29)
    else:
        days_by_period = {"7d": 7, "30d": 30, "60d": 60, "90d": 90}
        days = days_by_period.get(clean_period, 30)
        start = today - timedelta(days=days - 1)

    end = end_date or today
    if start > end:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser mayor que la fecha final")

    start_dt = datetime.combine(start, time.min)
    end_dt = datetime.combine(end + timedelta(days=1), time.min)
    return start_dt, end_dt, start, end

def _metric_effective_date_expr():
    # Historial y filtros de Mis medidas deben usar la fecha real de toma.
    return func.coalesce(BodyMetric.measured_at, BodyMetric.created_at)


def _safe_visibility(value: str | None) -> str:
    visibility = (value or "public").strip().lower()
    return visibility if visibility in VISIBILITY_LABELS else "public"


def _can_access_user_history(target_user: User, current_user: User) -> bool:
    if current_user.role == "admin":
        return True
    if current_user.id == target_user.id:
        return True
    if current_user.role == "trainer":
        # El entrenador puede revisar historial de clientes para seguimiento operativo.
        return target_user.role == "client"
    return False


def _format_date(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _post_item(post: CommunityPost, db: Session) -> dict[str, Any]:
    likes = db.query(PostReaction).filter(PostReaction.post_id == post.id).count()
    comments = db.query(PostComment).filter(PostComment.post_id == post.id).count()
    visibility = _safe_visibility(getattr(post, "visibility", "public"))
    has_image = bool(post.image_url)
    content = (post.content or "").strip()
    title = "Publicación con imagen" if has_image else "Publicación"
    if visibility == "private":
        title = "Registro privado"
    elif visibility == "staff":
        title = "Registro para entrenador/admin"
    elif visibility == "friends":
        title = "Publicación para amigos"

    return {
        "id": f"post-{post.id}",
        "source_id": post.id,
        "type": "post",
        "type_label": "Publicación",
        "title": title,
        "subtitle": VISIBILITY_LABELS.get(visibility, "Comunidad"),
        "description": content,
        "image_url": post.image_url,
        "visibility": visibility,
        "visibility_label": VISIBILITY_LABELS.get(visibility, "Comunidad"),
        "created_at": _format_date(post.created_at),
        "meta": {
            "likes": likes,
            "comments": comments,
            "tags": getattr(post, "tags", "") or "",
        },
    }


def _progress_photo_item(photo: ProgressPhoto) -> dict[str, Any]:
    label = photo.label or "Progreso"
    return {
        "id": f"photo-{photo.id}",
        "source_id": photo.id,
        "type": "photo",
        "type_label": "Foto de progreso",
        "title": f"Foto de progreso - {label}",
        "subtitle": "Evolución física",
        "description": "Registro visual guardado en el historial personal.",
        "image_url": photo.image_url,
        "visibility": "private",
        "visibility_label": "Historial personal",
        "created_at": _format_date(photo.created_at),
        "meta": {
            "weight": photo.weight,
            "body_fat": photo.body_fat,
            "label": label,
        },
    }


def _checkin_item(checkin: DailyCheckin) -> dict[str, Any]:
    training_labels = {
        "trained": "Ya entrenó",
        "later": "Entrena más tarde",
        "missed": "No pudo entrenar",
        "rest": "Día de descanso",
        "completed": "Entrenamiento completado",
        "partial": "Entrenamiento parcial",
        "not_completed": "No completado",
    }
    nutrition_labels = {
        "done": "Alimentación cumplida",
        "partial": "Alimentación parcial",
        "missed": "Alimentación no cumplida",
        "later": "La registrará más tarde",
        "completed": "Alimentación cumplida",
        "not_completed": "No cumplida",
    }
    training = training_labels.get(checkin.training_status, checkin.training_status or "Sin registro")
    nutrition = nutrition_labels.get(checkin.nutrition_status, checkin.nutrition_status or "Sin registro")
    return {
        "id": f"checkin-{checkin.id}",
        "source_id": checkin.id,
        "type": "checkin",
        "type_label": "Check-in diario",
        "title": "Seguimiento diario",
        "subtitle": checkin.checkin_date,
        "description": f"Entrenamiento: {training}. Alimentación: {nutrition}.",
        "image_url": None,
        "visibility": "staff",
        "visibility_label": "Seguimiento interno",
        "created_at": _format_date(checkin.updated_at or checkin.created_at),
        "meta": {
            "training_status": checkin.training_status,
            "nutrition_status": checkin.nutrition_status,
            "planned_training_time": checkin.planned_training_time,
            "mood": checkin.mood,
            "notes": checkin.notes,
        },
    }


def _body_metric_item(metric: BodyMetric) -> dict[str, Any]:
    measured_at = getattr(metric, "measured_at", None) or metric.created_at
    recorded_at = getattr(metric, "recorded_at", None) or metric.created_at
    return {
        "id": f"metric-{metric.id}",
        "source_id": metric.id,
        "type": "metric",
        "type_label": "Medición corporal",
        "title": "Registro de medidas",
        "subtitle": "Peso, músculo y grasa corporal",
        "description": f"Peso: {metric.weight} kg · Músculo: {metric.muscle_mass} kg · Grasa: {metric.body_fat}%",
        "image_url": None,
        "visibility": "staff",
        "visibility_label": "Seguimiento técnico",
        "created_at": _format_date(measured_at),
        "meta": {
            "weight": metric.weight,
            "muscle_mass": metric.muscle_mass,
            "body_fat": metric.body_fat,
            "visceral_fat": metric.visceral_fat,
            "bmr": metric.bmr,
            "bmi": metric.bmi,
            "measured_at": _format_date(measured_at),
            "recorded_at": _format_date(recorded_at),
        },
    }


def _build_history(
    db: Session,
    target_user: User,
    item_type: str | None,
    visibility: str | None,
    limit: int,
    period: PeriodFilter | None = "30d",
    start_date: dt_date | None = None,
    end_date: dt_date | None = None,
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    start_dt, end_dt, start_day, end_day = _date_window(period, start_date, end_date)

    if item_type in {None, "all", "post"}:
        query = db.query(CommunityPost).filter(CommunityPost.author_id == target_user.id)
        if start_dt:
            query = query.filter(CommunityPost.created_at >= start_dt)
        if end_dt:
            query = query.filter(CommunityPost.created_at < end_dt)
        posts = query.order_by(CommunityPost.created_at.desc()).limit(min(limit, 250)).all()
        for post in posts:
            item = _post_item(post, db)
            if visibility and visibility != "all" and item["visibility"] != visibility:
                continue
            items.append(item)

    if item_type in {None, "all", "photo"}:
        query = db.query(ProgressPhoto).filter(ProgressPhoto.client_id == target_user.id)
        if start_dt:
            query = query.filter(ProgressPhoto.created_at >= start_dt)
        if end_dt:
            query = query.filter(ProgressPhoto.created_at < end_dt)
        photos = query.order_by(ProgressPhoto.created_at.desc()).limit(min(limit, 120)).all()
        items.extend(_progress_photo_item(photo) for photo in photos)

    if item_type in {None, "all", "checkin"}:
        query = db.query(DailyCheckin).filter(DailyCheckin.user_id == target_user.id)
        if start_day:
            query = query.filter(DailyCheckin.checkin_date >= start_day.isoformat())
        if end_day:
            query = query.filter(DailyCheckin.checkin_date <= end_day.isoformat())
        checkins = query.order_by(DailyCheckin.checkin_date.desc(), DailyCheckin.created_at.desc()).limit(min(limit, 120)).all()
        items.extend(_checkin_item(checkin) for checkin in checkins)

    if item_type in {None, "all", "metric"}:
        query = db.query(BodyMetric).filter(BodyMetric.user_id == target_user.id)
        effective_date = _metric_effective_date_expr()
        if start_dt:
            query = query.filter(effective_date >= start_dt)
        if end_dt:
            query = query.filter(effective_date < end_dt)
        metrics = query.order_by(effective_date.desc(), BodyMetric.id.desc()).limit(min(limit, 120)).all()
        items.extend(_body_metric_item(metric) for metric in metrics)

    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    limited_items = items[: max(1, min(limit, 300))]

    summary = {
        "period": period or "30d",
        "start_date": start_day.isoformat() if start_day else None,
        "end_date": end_day.isoformat() if end_day else None,
        "total_items": len(items),
        "posts": sum(1 for item in items if item["type"] == "post"),
        "photos": sum(1 for item in items if item["type"] == "photo"),
        "checkins": sum(1 for item in items if item["type"] == "checkin"),
        "metrics": sum(1 for item in items if item["type"] == "metric"),
        "last_activity_at": limited_items[0]["created_at"] if limited_items else None,
    }

    return {
        "user": {
            "id": target_user.id,
            "name": target_user.name,
            "email": target_user.email,
            "role": target_user.role,
            "avatar_url": target_user.avatar_url,
        },
        "summary": summary,
        "items": limited_items,
    }


@router.get("/me")
def my_history(
    item_type: str | None = Query(default="all", pattern="^(all|post|photo|checkin|metric)$"),
    visibility: str | None = Query(default="all"),
    period: PeriodFilter = Query(default="30d"),
    start_date: dt_date | None = Query(default=None),
    end_date: dt_date | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _build_history(db, current_user, item_type, visibility, limit, period, start_date, end_date)


@router.get("/users/{user_id}")
def user_history(
    user_id: int,
    item_type: str | None = Query(default="all", pattern="^(all|post|photo|checkin|metric)$"),
    visibility: str | None = Query(default="all"),
    period: PeriodFilter = Query(default="30d"),
    start_date: dt_date | None = Query(default=None),
    end_date: dt_date | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not _can_access_user_history(target_user, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este historial")
    return _build_history(db, target_user, item_type, visibility, limit, period, start_date, end_date)
