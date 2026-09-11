from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import Challenge, ChallengeParticipant, User
from app.schemas import ChallengeCreate, ChallengeOut, ChallengeParticipantOut
from app.core.time import utcnow


router = APIRouter(prefix="/challenges", tags=["challenges"])

ChallengeStatus = Literal["draft", "active", "closed", "cancelled"]
PaymentStatus = Literal["not_required", "pending", "approved", "rejected"]

DEFAULT_REFUND_TERMS = (
    "La garantía aplica si el participante cumple mínimo el 80% del reto, registra medición inicial y final, "
    "mantiene registros consistentes y no mejora en al menos 2 indicadores medibles. No aplica por abandono, "
    "falta de evidencia o datos inconsistentes."
)

DEFAULT_GOAL_RANGES = {
    "weight_loss": {
        "label": "Reducción de peso",
        "description": "Meta racional: reducción gradual de peso, cintura y grasa corporal sin prometer cambios extremos.",
        "weight_loss_min_kg": 1.8,
        "weight_loss_max_kg": 7.2,
        "waist_loss_min_cm": 2.0,
        "body_fat_loss_min_pp": 1.0,
        "muscle_gain_min_kg": 0.0,
        "strength_improved_exercises_min": 1,
    },
    "fat_loss": {
        "label": "Reducción de grasa",
        "description": "Meta racional: bajar grasa y cintura mientras se sostiene la fuerza.",
        "weight_loss_min_kg": 0.5,
        "weight_loss_max_kg": 6.0,
        "waist_loss_min_cm": 2.0,
        "body_fat_loss_min_pp": 1.0,
        "muscle_gain_min_kg": 0.0,
        "strength_improved_exercises_min": 1,
    },
    "muscle_gain": {
        "label": "Aumento de masa muscular",
        "description": "Meta racional: mejorar masa muscular, fuerza y adherencia sin exigir pérdida de peso.",
        "weight_loss_min_kg": 0.0,
        "weight_loss_max_kg": 0.0,
        "waist_loss_min_cm": 0.5,
        "body_fat_loss_min_pp": 0.0,
        "muscle_gain_min_kg": 0.5,
        "strength_improved_exercises_min": 2,
    },
    "recomposition": {
        "label": "Recomposición corporal",
        "description": "Meta racional: mejorar medidas, grasa, fuerza o masa muscular, aunque el peso no cambie mucho.",
        "weight_loss_min_kg": 0.5,
        "weight_loss_max_kg": 4.0,
        "waist_loss_min_cm": 1.5,
        "body_fat_loss_min_pp": 0.7,
        "muscle_gain_min_kg": 0.3,
        "strength_improved_exercises_min": 2,
    },
}


def _default_config(target_focus: str = "recomposition", training_days_per_week: int = 3) -> dict[str, Any]:
    focus = target_focus if target_focus in DEFAULT_GOAL_RANGES else "recomposition"
    return {
        "training_days_per_week": max(1, min(7, int(training_days_per_week or 3))),
        "exclusive_enabled": True,
        "weekly_review_day": "Domingo",
        "anti_fraud_review": True,
        "premium_access_rule": "Solo participantes con pago validado ven métricas completas del reto.",
        "target_focus": focus,
        "goal_ranges": DEFAULT_GOAL_RANGES,
        "weekly_review_required": True,
        "evidence_required": ["medicion_inicial", "checkins", "habitos", "cargas", "medicion_final"],
    }


class ChallengeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: ChallengeStatus | None = None
    challenge_type: str | None = Field(default=None, max_length=60)
    price_cop: int | None = Field(default=None, ge=0, le=50_000_000)
    compare_at_cop: int | None = Field(default=None, ge=0, le=50_000_000)
    launch_badge: str | None = Field(default=None, max_length=80)
    slots_total: int | None = Field(default=None, ge=0, le=100_000)
    duration_weeks: int | None = Field(default=None, ge=1, le=52)
    guarantee_enabled: bool | None = None
    min_completion_percent: int | None = Field(default=None, ge=0, le=100)
    min_improvement_indicators: int | None = Field(default=None, ge=0, le=10)
    refund_terms: str | None = Field(default=None, max_length=3000)
    training_days_per_week: int | None = Field(default=None, ge=1, le=7)
    target_focus: Literal["weight_loss", "fat_loss", "muscle_gain", "recomposition"] | None = None


class ParticipantMeasurementUpdate(BaseModel):
    baseline_weight: float | None = Field(default=None, ge=0, le=400)
    baseline_waist: float | None = Field(default=None, ge=0, le=250)
    baseline_body_fat: float | None = Field(default=None, ge=0, le=80)
    baseline_muscle_mass: float | None = Field(default=None, ge=0, le=200)
    final_weight: float | None = Field(default=None, ge=0, le=400)
    final_waist: float | None = Field(default=None, ge=0, le=250)
    final_body_fat: float | None = Field(default=None, ge=0, le=80)
    final_muscle_mass: float | None = Field(default=None, ge=0, le=200)
    admin_notes: str | None = Field(default=None, max_length=1000)


class ParticipantPaymentReview(BaseModel):
    payment_status: PaymentStatus = "approved"
    paid_amount_cop: int | None = Field(default=None, ge=0, le=50_000_000)
    admin_notes: str = Field(default="", max_length=1000)


def _as_date(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    try:
        raw = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(raw).replace(tzinfo=None)
    except Exception:
        return None


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.lower() in {"1", "true", "yes", "si", "sí"}
    return bool(value)


def _config(challenge: Challenge | dict) -> dict[str, Any]:
    raw = challenge.config_json if isinstance(challenge, Challenge) else challenge.get("config_json")
    try:
        data = json.loads(raw or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _target_focus(challenge: Challenge | dict) -> str:
    cfg = _config(challenge)
    focus = str(cfg.get("target_focus") or "recomposition")
    return focus if focus in DEFAULT_GOAL_RANGES else "recomposition"


def _goal_ranges(challenge: Challenge | dict) -> dict[str, Any]:
    cfg = _config(challenge)
    ranges = cfg.get("goal_ranges") if isinstance(cfg.get("goal_ranges"), dict) else DEFAULT_GOAL_RANGES
    focus = _target_focus(challenge)
    return dict(ranges.get(focus) or DEFAULT_GOAL_RANGES[focus])


def _training_days_per_week(challenge: Challenge | dict) -> int:
    cfg = _config(challenge)
    try:
        return max(1, min(7, int(cfg.get("training_days_per_week") or 3)))
    except Exception:
        return 3


def _challenge_window(challenge: Challenge | dict) -> tuple[datetime, datetime, int]:
    starts_at = _as_date(challenge.starts_at if isinstance(challenge, Challenge) else challenge.get("starts_at"))
    created_at = _as_date(challenge.created_at if isinstance(challenge, Challenge) else challenge.get("created_at"))
    duration_weeks = int((challenge.duration_weeks if isinstance(challenge, Challenge) else challenge.get("duration_weeks")) or 8)
    start = starts_at or created_at or utcnow()
    end = _as_date(challenge.ends_at if isinstance(challenge, Challenge) else challenge.get("ends_at")) or (start + timedelta(weeks=duration_weeks) - timedelta(minutes=1))
    return start, end, max(1, duration_weeks)


def _participants_count(db: Session, challenge_id: int) -> int:
    return int(db.execute(text("select count(*) from public.challenge_participants where challenge_id = :challenge_id and status <> 'withdrawn'"), {"challenge_id": challenge_id}).scalar() or 0)


def _participant_for_user(db: Session, challenge_id: int, user_id: int):
    return db.execute(text("""
        select * from public.challenge_participants
        where challenge_id = :challenge_id and user_id = :user_id
        limit 1
    """), {"challenge_id": challenge_id, "user_id": user_id}).mappings().first()


def _premium_challenge_defaults(current_user_id: int | None = None) -> dict[str, Any]:
    start = utcnow()
    return {
        "title": "Reto Camino Imperial 8 Semanas",
        "description": "Experiencia premium de transformación con seguimiento semanal, ranking, métricas verificables, entrenamiento, nutrición, hábitos, progresión de cargas, medición inicial/final y garantía condicionada por cumplimiento.",
        "starts_at": start,
        "ends_at": start + timedelta(weeks=8) - timedelta(minutes=1),
        "status": "active",
        "challenge_type": "transformation_8w",
        "price_cop": 80000,
        "compare_at_cop": 120000,
        "currency": "COP",
        "launch_badge": "Precio de lanzamiento",
        "slots_total": 50,
        "duration_weeks": 8,
        "guarantee_enabled": True,
        "min_completion_percent": 80,
        "min_improvement_indicators": 2,
        "refund_terms": DEFAULT_REFUND_TERMS,
        "config_json": json.dumps(_default_config("recomposition", 3), ensure_ascii=False),
        "created_by": current_user_id,
    }


def _get_or_create_premium_challenge(db: Session, current_user: User) -> Challenge:
    existing = db.query(Challenge).filter(
        Challenge.challenge_type == "transformation_8w",
        Challenge.status.in_(["active", "draft"]),
    ).order_by(Challenge.created_at.desc()).first()
    if existing:
        return existing
    try:
        challenge = Challenge(**_premium_challenge_defaults(current_user.id))
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        return challenge
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No pudimos publicar el reto. Actualiza la estructura del módulo de retos y vuelve a intentarlo.") from exc


def _in_clause(statement: str):
    return text(statement).bindparams(bindparam("user_ids", expanding=True))


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def _compute_improvements(
    participant: dict[str, Any] | None,
    body_first: dict[str, Any] | None,
    body_last: dict[str, Any] | None,
    improved_exercises: int,
    challenge: Challenge | dict,
) -> tuple[int, list[dict[str, Any]], dict[str, Any]]:
    ranges = _goal_ranges(challenge)
    focus = _target_focus(challenge)

    baseline_weight = _float_or_none((participant or {}).get("baseline_weight")) or _float_or_none((body_first or {}).get("weight"))
    final_weight = _float_or_none((participant or {}).get("final_weight")) or _float_or_none((body_last or {}).get("weight"))
    baseline_waist = _float_or_none((participant or {}).get("baseline_waist"))
    final_waist = _float_or_none((participant or {}).get("final_waist"))
    baseline_body_fat = _float_or_none((participant or {}).get("baseline_body_fat")) or _float_or_none((body_first or {}).get("body_fat"))
    final_body_fat = _float_or_none((participant or {}).get("final_body_fat")) or _float_or_none((body_last or {}).get("body_fat"))
    baseline_muscle = _float_or_none((participant or {}).get("baseline_muscle_mass")) or _float_or_none((body_first or {}).get("muscle_mass"))
    final_muscle = _float_or_none((participant or {}).get("final_muscle_mass")) or _float_or_none((body_last or {}).get("muscle_mass"))

    weight_delta = (final_weight - baseline_weight) if baseline_weight is not None and final_weight is not None else None
    waist_delta = (final_waist - baseline_waist) if baseline_waist is not None and final_waist is not None else None
    fat_delta = (final_body_fat - baseline_body_fat) if baseline_body_fat is not None and final_body_fat is not None else None
    muscle_delta = (final_muscle - baseline_muscle) if baseline_muscle is not None and final_muscle is not None else None

    details: list[dict[str, Any]] = []

    def add(key: str, label: str, achieved: bool, value: float | None, target: str):
        details.append({"key": key, "label": label, "achieved": bool(achieved), "value": value, "target": target})

    weight_loss = -(weight_delta or 0)
    if focus in {"weight_loss", "fat_loss", "recomposition"}:
        min_loss = float(ranges.get("weight_loss_min_kg") or 0)
        add("weight_loss", "Reducción de peso", weight_delta is not None and weight_loss >= min_loss, weight_delta, f"-{min_loss:g} kg o más")

    waist_loss = -(waist_delta or 0)
    waist_min = float(ranges.get("waist_loss_min_cm") or 0)
    add("waist_loss", "Reducción de cintura", waist_delta is not None and waist_loss >= waist_min, waist_delta, f"-{waist_min:g} cm o más")

    fat_loss = -(fat_delta or 0)
    fat_min = float(ranges.get("body_fat_loss_min_pp") or 0)
    if fat_min > 0:
        add("body_fat_loss", "Reducción de grasa", fat_delta is not None and fat_loss >= fat_min, fat_delta, f"-{fat_min:g} puntos o más")

    muscle_min = float(ranges.get("muscle_gain_min_kg") or 0)
    if focus in {"muscle_gain", "recomposition"} and muscle_min > 0:
        add("muscle_gain", "Aumento de masa muscular", muscle_delta is not None and muscle_delta >= muscle_min, muscle_delta, f"+{muscle_min:g} kg o más")

    strength_min = int(ranges.get("strength_improved_exercises_min") or 1)
    add("strength_progress", "Mejora de cargas", improved_exercises >= strength_min, float(improved_exercises), f"{strength_min} ejercicios con progreso")

    count = sum(1 for item in details if item["achieved"])
    body_change = {
        "baseline_weight": baseline_weight,
        "current_weight": final_weight,
        "weight_delta": weight_delta,
        "baseline_waist": baseline_waist,
        "current_waist": final_waist,
        "waist_delta": waist_delta,
        "baseline_body_fat": baseline_body_fat,
        "current_body_fat": final_body_fat,
        "body_fat_delta": fat_delta,
        "baseline_muscle_mass": baseline_muscle,
        "current_muscle_mass": final_muscle,
        "muscle_delta": muscle_delta,
    }
    return count, details, body_change


def _aggregate_for_users(db: Session, challenge: Challenge, rows: list[dict[str, Any]], week: int | None = None) -> dict[int, dict[str, Any]]:
    user_ids = [int(row["user_id"]) for row in rows]
    if not user_ids:
        return {}
    challenge_start, challenge_end, duration_weeks = _challenge_window(challenge)
    if week:
        start = challenge_start + timedelta(days=(week - 1) * 7)
        end = min(challenge_end, start + timedelta(days=7) - timedelta(seconds=1))
        period_weeks = 1
    else:
        start, end = challenge_start, challenge_end
        period_weeks = duration_weeks
    now = utcnow()
    effective_end = min(now, end)
    if effective_end < start:
        effective_end = start
    total_days = max(1, (end.date() - start.date()).days + 1)
    elapsed_days = max(0, min(total_days, (effective_end.date() - start.date()).days + 1))
    training_target = max(1, period_weeks * _training_days_per_week(challenge))

    result: dict[int, dict[str, Any]] = {uid: {"completed_habits": 0, "training_done": 0, "nutrition_done": 0, "checkins_total": 0, "strength_logs_count": 0, "attendance_count": 0, "active_days": 0, "progress_photos": 0, "body_metrics": 0, "improved_exercises": 0} for uid in user_ids}

    def map_counts(sql: str, params: dict[str, Any], keys: tuple[str, ...]) -> None:
        records = db.execute(_in_clause(sql), {**params, "user_ids": user_ids}).mappings().all()
        for rec in records:
            uid = int(rec["user_id"])
            bucket = result.setdefault(uid, {})
            for key in keys:
                bucket[key] = int(rec.get(key) or 0)

    map_counts("""
        select user_id, count(*) as completed_habits
        from public.habit_completions
        where user_id in :user_ids and completed = 1 and completion_date >= :start_date and completion_date <= :end_date
        group by user_id
    """, {"start_date": start.date(), "end_date": end.date()}, ("completed_habits",))

    active_habits = db.execute(_in_clause("""
        select user_id, coalesce(sum(frequency_days), 0) as weekly_habit_target
        from public.user_habits
        where user_id in :user_ids and active = 1
        group by user_id
    """), {"user_ids": user_ids}).mappings().all()
    weekly_targets = {int(row["user_id"]): int(row.get("weekly_habit_target") or 0) for row in active_habits}

    checkins = db.execute(_in_clause("""
        select user_id,
               sum(case when training_status = 'trained' then 1 else 0 end) as training_done,
               sum(case when nutrition_status = 'completed' then 1 else 0 end) as nutrition_done,
               count(*) as checkins_total
        from public.daily_checkins
        where user_id in :user_ids and checkin_date >= :start_date and checkin_date <= :end_date
        group by user_id
    """), {"user_ids": user_ids, "start_date": start.date().isoformat(), "end_date": end.date().isoformat()}).mappings().all()
    for row in checkins:
        bucket = result[int(row["user_id"])]
        bucket["training_done"] = int(row.get("training_done") or 0)
        bucket["nutrition_done"] = int(row.get("nutrition_done") or 0)
        bucket["checkins_total"] = int(row.get("checkins_total") or 0)

    strength_rows = db.execute(_in_clause("""
        select user_id, exercise_name, weight_kg, reps, sets, created_at
        from public.strength_goal_logs
        where user_id in :user_ids and created_at >= :start_dt and created_at < :end_dt
        order by user_id asc, exercise_name asc, created_at asc
    """), {"user_ids": user_ids, "start_dt": start, "end_dt": end + timedelta(seconds=1)}).mappings().all()
    first_by_user_exercise: dict[tuple[int, str], float] = {}
    improved_exercises_by_user: dict[int, set[str]] = {uid: set() for uid in user_ids}
    for row in strength_rows:
        uid = int(row["user_id"])
        result[uid]["strength_logs_count"] = int(result[uid].get("strength_logs_count") or 0) + 1
        exercise = str(row.get("exercise_name") or "").strip().lower()
        if not exercise:
            continue
        volume = float(row.get("weight_kg") or 0) * int(row.get("reps") or 0) * int(row.get("sets") or 1)
        key = (uid, exercise)
        if key not in first_by_user_exercise:
            first_by_user_exercise[key] = volume
        elif volume > first_by_user_exercise[key] * 1.03:
            improved_exercises_by_user.setdefault(uid, set()).add(exercise)
    for uid, exercises in improved_exercises_by_user.items():
        result[uid]["improved_exercises"] = len(exercises)

    map_counts("""
        select user_id, count(*) as attendance_count
        from public.attendance_logs
        where user_id in :user_ids and checked_at >= :start_dt and checked_at < :end_dt
        group by user_id
    """, {"start_dt": start, "end_dt": end + timedelta(seconds=1)}, ("attendance_count",))

    active_day_rows = db.execute(_in_clause("""
        select user_id, count(distinct d) as active_days from (
            select user_id, completion_date::date as d from public.habit_completions where user_id in :user_ids and completion_date >= :start_date and completion_date <= :end_date
            union all select user_id, checkin_date::date as d from public.daily_checkins where user_id in :user_ids and checkin_date >= :start_date_text and checkin_date <= :end_date_text
            union all select user_id, created_at::date as d from public.strength_goal_logs where user_id in :user_ids and created_at >= :start_dt and created_at < :end_dt
            union all select user_id, checked_at::date as d from public.attendance_logs where user_id in :user_ids and checked_at >= :start_dt and checked_at < :end_dt
        ) events group by user_id
    """), {"user_ids": user_ids, "start_date": start.date(), "end_date": end.date(), "start_date_text": start.date().isoformat(), "end_date_text": end.date().isoformat(), "start_dt": start, "end_dt": end + timedelta(seconds=1)}).mappings().all()
    for row in active_day_rows:
        result[int(row["user_id"])]["active_days"] = int(row.get("active_days") or 0)

    map_counts("""
        select client_id as user_id, count(*) as progress_photos
        from public.progress_photos
        where client_id in :user_ids and created_at >= :start_dt and created_at < :end_dt
        group by client_id
    """, {"start_dt": challenge_start, "end_dt": challenge_end + timedelta(days=1)}, ("progress_photos",))

    body_rows = db.execute(_in_clause("""
        select user_id, weight, muscle_mass, body_fat,
               coalesce(measured_at, created_at) as created_at,
               recorded_at
        from public.body_metrics
        where user_id in :user_ids and coalesce(measured_at, created_at) >= :start_dt and coalesce(measured_at, created_at) < :end_dt
        order by user_id asc, coalesce(measured_at, created_at) asc
    """), {"user_ids": user_ids, "start_dt": challenge_start, "end_dt": challenge_end + timedelta(days=1)}).mappings().all()
    first_body: dict[int, dict[str, Any]] = {}
    last_body: dict[int, dict[str, Any]] = {}
    late_body_metric_by_user: dict[int, int] = {}
    for row in body_rows:
        uid = int(row["user_id"])
        data = dict(row)
        first_body.setdefault(uid, data)
        last_body[uid] = data
        result[uid]["body_metrics"] = int(result[uid].get("body_metrics") or 0) + 1
        measured = _as_date(data.get("created_at"))
        recorded = _as_date(data.get("recorded_at"))
        if measured and recorded and (recorded.date() - measured.date()).days >= 3:
            late_body_metric_by_user[uid] = late_body_metric_by_user.get(uid, 0) + 1

    participant_by_user = {int(row["user_id"]): row for row in rows}
    start_full, end_full, duration_full = _challenge_window(challenge)
    elapsed_full = max(0, min(max(1, (end_full.date() - start_full.date()).days + 1), ((min(utcnow(), end_full).date() - start_full.date()).days + 1)))
    current_week = max(1, min(duration_full, ((elapsed_full - 1) // 7) + 1)) if elapsed_full else 1
    min_completion = int(challenge.min_completion_percent or 80)
    min_improvements = int(challenge.min_improvement_indicators or 2)
    guarantee_enabled = _to_bool(challenge.guarantee_enabled)

    for uid in user_ids:
        data = result[uid]
        habit_target = max(1, int(round((weekly_targets.get(uid, 0) or 5) * max(1, period_weeks))))
        habit_percent = min(100, round((int(data.get("completed_habits") or 0) / habit_target) * 100))
        training_percent = min(100, round((int(data.get("training_done") or 0) / training_target) * 100))
        nutrition_percent = min(100, round((int(data.get("nutrition_done") or 0) / max(1, total_days)) * 100))
        strength_percent = min(100, round((int(data.get("strength_logs_count") or 0) / training_target) * 100))
        attendance_percent = min(100, round((int(data.get("attendance_count") or 0) / training_target) * 100))
        completion_percent = round((habit_percent * 0.30) + (training_percent * 0.30) + (nutrition_percent * 0.20) + (max(strength_percent, attendance_percent) * 0.20))
        improvement_indicators, improvement_details, body_change = _compute_improvements(participant_by_user.get(uid), first_body.get(uid), last_body.get(uid), int(data.get("improved_exercises") or 0), challenge)
        if not guarantee_enabled:
            guarantee_status = "sin_garantia"
        elif utcnow() < challenge_end:
            guarantee_status = "en_proceso"
        elif completion_percent < min_completion:
            guarantee_status = "no_aplica_por_cumplimiento"
        elif improvement_indicators < min_improvements:
            guarantee_status = "revisar_devolucion"
        else:
            guarantee_status = "resultado_logrado"
        flags: list[str] = []
        participant = participant_by_user.get(uid) or {}
        if participant.get("payment_status") not in {"approved", "not_required"}:
            flags.append("Pago pendiente: el tablero premium completo queda bloqueado.")
        if participant.get("baseline_weight") is None and participant.get("baseline_waist") is None and participant.get("baseline_body_fat") is None and not first_body.get(uid):
            flags.append("Falta medición inicial o primer registro corporal.")
        if elapsed_days >= 7 and int(data.get("checkins_total") or 0) == 0:
            flags.append("Sin check-ins en la semana o periodo revisado.")
        if completion_percent >= 80 and int(data.get("active_days") or 0) <= max(1, elapsed_days // 5):
            flags.append("Registros concentrados en pocos días; revisar consistencia.")
        if training_percent >= 70 and int(data.get("strength_logs_count") or 0) == 0 and int(data.get("attendance_count") or 0) == 0:
            flags.append("Reporta entreno, pero no hay cargas ni asistencia asociada.")
        if late_body_metric_by_user.get(uid, 0) > 0:
            flags.append("Tiene mediciones cargadas días después de la toma; revisar evidencia InBody si aplica garantía.")
        if not flags:
            flags.append("Sin alertas importantes hasta el momento.")
        data.update({
            "days_total": total_days if week else max(1, (challenge_end.date() - challenge_start.date()).days + 1),
            "days_elapsed": elapsed_days if week else elapsed_full,
            "current_week": current_week,
            "duration_weeks": duration_full,
            "training_target": training_target if week else max(1, duration_full * _training_days_per_week(challenge)),
            "habit_target": habit_target,
            "habit_percent": habit_percent,
            "training_percent": training_percent,
            "nutrition_percent": nutrition_percent,
            "strength_percent": strength_percent,
            "attendance_percent": attendance_percent,
            "completion_percent": completion_percent,
            "improvement_indicators": improvement_indicators,
            "improvement_details": improvement_details,
            "body_change": body_change,
            "evidence_summary": {"progress_photos": int(data.get("progress_photos") or 0), "body_metrics": int(data.get("body_metrics") or 0)},
            "integrity_flags": flags,
            "guarantee_status": guarantee_status,
            "goal_summary": {"focus": _target_focus(challenge), **_goal_ranges(challenge)},
        })
    return result


def _challenge_progress(db: Session, challenge: Challenge | dict, user_id: int) -> dict[str, Any]:
    participant = _participant_for_user(db, int(challenge.id if isinstance(challenge, Challenge) else challenge.get("id")), user_id)
    if not participant:
        start, end, duration = _challenge_window(challenge)
        return {"days_total": max(1, (end.date() - start.date()).days + 1), "days_elapsed": 0, "current_week": 1, "duration_weeks": duration, "completion_percent": 0, "goal_summary": {"focus": _target_focus(challenge), **_goal_ranges(challenge)}, "integrity_flags": ["Inscripción pendiente."], "guarantee_status": "en_proceso"}
    return _aggregate_for_users(db, challenge, [dict(participant)]).get(user_id, {})


def _challenge_out(challenge: Challenge, db: Session, current_user: User | None = None, include_progress: bool = False) -> ChallengeOut:
    participants_count = _participants_count(db, challenge.id)
    slots_total = int(challenge.slots_total or 0)
    my_participation = None
    my_progress = None
    if current_user:
        participant = _participant_for_user(db, challenge.id, current_user.id)
        if participant:
            my_participation = dict(participant)
            if include_progress:
                my_progress = _challenge_progress(db, challenge, current_user.id)
    goal_ranges = _goal_ranges(challenge)
    return ChallengeOut(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        status=challenge.status,
        participants_count=participants_count,
        starts_at=challenge.starts_at,
        ends_at=challenge.ends_at,
        created_at=challenge.created_at,
        challenge_type=challenge.challenge_type,
        price_cop=challenge.price_cop,
        compare_at_cop=challenge.compare_at_cop,
        currency=challenge.currency,
        launch_badge=challenge.launch_badge,
        slots_total=slots_total,
        slots_remaining=max(0, slots_total - participants_count) if slots_total else None,
        duration_weeks=challenge.duration_weeks,
        guarantee_enabled=bool(challenge.guarantee_enabled),
        min_completion_percent=challenge.min_completion_percent,
        min_improvement_indicators=challenge.min_improvement_indicators,
        refund_terms=challenge.refund_terms,
        training_days_per_week=_training_days_per_week(challenge),
        target_focus=_target_focus(challenge),
        goal_label=str(goal_ranges.get("label") or "Recomposición corporal"),
        goal_description=str(goal_ranges.get("description") or "Meta racional de 8 semanas."),
        realistic_targets=goal_ranges,
        my_participation=my_participation,
        my_progress=my_progress,
    )


@router.get("", response_model=list[ChallengeOut])
def list_challenges(status: str | None = Query(default=None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Challenge)
    if current_user.role == "client":
        query = query.filter(Challenge.status == "active")
    elif status:
        query = query.filter(Challenge.status == status)
    else:
        query = query.filter(Challenge.status.in_(["active", "draft", "closed"]))
    rows = query.order_by(Challenge.created_at.desc()).limit(50).all()
    if not rows and current_user.role in {"admin", "trainer"} and not status:
        rows = [_get_or_create_premium_challenge(db, current_user)]
    include_progress = current_user.role == "client"
    return [_challenge_out(row, db, current_user, include_progress=include_progress) for row in rows]


@router.post("", response_model=ChallengeOut)
def create_challenge(payload: ChallengeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    data = payload.model_dump()
    training_days_per_week = data.pop("training_days_per_week", 3)
    target_focus = data.pop("target_focus", "recomposition") if "target_focus" in data else "recomposition"
    data["config_json"] = json.dumps(_default_config(target_focus, training_days_per_week), ensure_ascii=False)
    data["created_by"] = current_user.id
    try:
        challenge = Challenge(**data)
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="No pudimos guardar el reto. Verifica que el módulo de retos esté actualizado y vuelve a intentar.") from exc
    return _challenge_out(challenge, db, current_user)


@router.post("/quick-start", response_model=ChallengeOut)
def create_default_challenge(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    challenge = _get_or_create_premium_challenge(db, current_user)
    return _challenge_out(challenge, db, current_user)


@router.post("/ensure-premium", response_model=ChallengeOut)
def ensure_premium_challenge(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    challenge = _get_or_create_premium_challenge(db, current_user)
    return _challenge_out(challenge, db, current_user)


@router.patch("/{challenge_id}", response_model=ChallengeOut)
def update_challenge(challenge_id: int, payload: ChallengeUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    data = payload.model_dump(exclude_unset=True)
    cfg = _config(challenge)
    if "training_days_per_week" in data or "target_focus" in data:
        training_days_per_week = data.pop("training_days_per_week", cfg.get("training_days_per_week", 3))
        target_focus = data.pop("target_focus", cfg.get("target_focus", "recomposition"))
        cfg.update(_default_config(target_focus, int(training_days_per_week or 3)))
        challenge.config_json = json.dumps(cfg, ensure_ascii=False)
    for key, value in data.items():
        if hasattr(challenge, key):
            setattr(challenge, key, value)
    challenge.updated_at = utcnow()
    db.commit()
    db.refresh(challenge)
    return _challenge_out(challenge, db, current_user)


@router.post("/{challenge_id}/join", response_model=ChallengeParticipantOut)
def join_challenge(challenge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge or challenge.status != "active":
        raise HTTPException(status_code=404, detail="Reto no disponible")
    participants_count = _participants_count(db, challenge_id)
    if challenge.slots_total and participants_count >= challenge.slots_total:
        raise HTTPException(status_code=409, detail="Los cupos de este reto ya están completos")
    existing = db.query(ChallengeParticipant).filter(ChallengeParticipant.challenge_id == challenge_id, ChallengeParticipant.user_id == current_user.id).first()
    if existing:
        return existing
    price = int(challenge.price_cop or 0)
    participant = ChallengeParticipant(challenge_id=challenge_id, user_id=current_user.id, progress_value=0, status="pending_payment" if price > 0 else "active", payment_status="pending" if price > 0 else "not_required", paid_amount_cop=0)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/{challenge_id}/me")
def get_my_challenge_progress(challenge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    participant = _participant_for_user(db, challenge_id, current_user.id)
    if not participant:
        raise HTTPException(status_code=404, detail="No estás inscrito en este reto")
    return {"participant": dict(participant), "progress": _challenge_progress(db, challenge, current_user.id)}


@router.get("/{challenge_id}/participants")
def list_challenge_participants(
    challenge_id: int,
    limit: int = Query(default=200, ge=1, le=600),
    week: int | None = Query(default=None, ge=1, le=52),
    payment_status: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    challenge = db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    rows = db.execute(text("""
        select cp.*, u.name, u.email, u.phone_number
        from public.challenge_participants cp
        join public.users u on u.id = cp.user_id
        where cp.challenge_id = :challenge_id
          and (:payment_status is null or cp.payment_status = :payment_status)
          and (:status is null or cp.status = :status)
        order by case when cp.payment_status = 'approved' then 0 when cp.payment_status = 'pending' then 1 else 2 end, cp.joined_at desc
        limit :limit
    """), {"challenge_id": challenge_id, "limit": limit, "payment_status": payment_status, "status": status}).mappings().all()
    row_dicts = [dict(row) for row in rows]
    progress_by_user = _aggregate_for_users(db, challenge, row_dicts, week=week)
    result = []
    for row in row_dicts:
        progress = progress_by_user.get(int(row["user_id"]), {})
        if week:
            progress["selected_week"] = {
                "week": week,
                "start_date": ( _challenge_window(challenge)[0] + timedelta(days=(week - 1) * 7)).date().isoformat(),
                "end_date": min(_challenge_window(challenge)[1], _challenge_window(challenge)[0] + timedelta(days=week * 7) - timedelta(seconds=1)).date().isoformat(),
                "completion_percent": progress.get("completion_percent", 0),
                "completed_habits": progress.get("completed_habits", 0),
                "training_done": progress.get("training_done", 0),
                "nutrition_done": progress.get("nutrition_done", 0),
                "strength_logs_count": progress.get("strength_logs_count", 0),
                "attendance_count": progress.get("attendance_count", 0),
                "active_days": progress.get("active_days", 0),
            }
        result.append({"participant": row, "progress": progress})
    return result


@router.patch("/{challenge_id}/participants/{participant_id}/payment")
def review_participant_payment(challenge_id: int, participant_id: int, payload: ParticipantPaymentReview, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    participant = db.query(ChallengeParticipant).filter(ChallengeParticipant.id == participant_id, ChallengeParticipant.challenge_id == challenge_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    participant.payment_status = payload.payment_status
    if payload.payment_status == "approved":
        participant.status = "active"
    elif payload.payment_status == "rejected":
        participant.status = "pending_payment"
    if payload.paid_amount_cop is not None:
        participant.paid_amount_cop = payload.paid_amount_cop
    if payload.admin_notes:
        participant.admin_notes = payload.admin_notes
    participant.updated_at = utcnow()
    db.commit()
    return {"ok": True}


@router.patch("/{challenge_id}/participants/{participant_id}/measurements")
def update_participant_measurements(challenge_id: int, participant_id: int, payload: ParticipantMeasurementUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    participant = db.query(ChallengeParticipant).filter(ChallengeParticipant.id == participant_id, ChallengeParticipant.challenge_id == challenge_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(participant, key):
            setattr(participant, key, value)
    participant.updated_at = utcnow()
    db.commit()
    return {"ok": True}


@router.patch("/{challenge_id}/progress", response_model=ChallengeParticipantOut)
def update_challenge_progress(challenge_id: int, progress_value: float, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    participant = db.query(ChallengeParticipant).filter(ChallengeParticipant.challenge_id == challenge_id, ChallengeParticipant.user_id == current_user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="No estás inscrito en este reto")
    participant.progress_value = progress_value
    participant.updated_at = utcnow()
    db.commit()
    db.refresh(participant)
    return participant
