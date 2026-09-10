from __future__ import annotations

from datetime import date as dt_date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import User
from app.services.gamification_engine import (
    STREAK_LABELS,
    award_badge,
    award_xp_once,
    complete_mission_once,
    ensure_gamification_status,
    process_daily_checkin,
    progression_from_strength_log,
    recalculate_streak_from_dates,
    sync_daily_checkin_history_to_habits,
    update_streak,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])

HabitCategory = Literal["training", "nutrition", "water", "sleep", "mental", "mobility", "gym", "custom"]
HabitTargetType = Literal["boolean", "number", "weight", "reps", "minutes"]
StrengthStatus = Literal["active", "completed", "paused"]
PeriodFilter = Literal["7d", "30d", "60d", "90d", "180d", "365d", "current_month", "previous_month", "all"]

XP_BY_CATEGORY: dict[str, tuple[int, int]] = {
    "training": (10, 2),
    "gym": (12, 3),
    "nutrition": (10, 2),
    "water": (5, 1),
    "sleep": (5, 1),
    "mental": (5, 1),
    "mobility": (6, 1),
    "custom": (5, 1),
}

STREAK_BY_CATEGORY = {
    "training": "training",
    "gym": "training",
    "nutrition": "nutrition",
    "water": "water",
    "sleep": "sleep",
    "mental": "mental",
    "mobility": "progress",
    "custom": "habit_consistency",
}


class GamificationActionRequest(BaseModel):
    kind: Literal["water", "sleep", "mental", "progress"]
    status: Literal["completed", "partial", "missed"] = "completed"
    notes: str = Field(default="", max_length=500)


class HabitCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: HabitCategory = "custom"
    target_type: HabitTargetType = "boolean"
    target_value: float = Field(default=1, ge=0, le=1000)
    unit: str = Field(default="check", max_length=30)
    frequency_days: int = Field(default=7, ge=1, le=7)


class HabitUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    category: HabitCategory | None = None
    target_type: HabitTargetType | None = None
    target_value: float | None = Field(default=None, ge=0, le=1000)
    unit: str | None = Field(default=None, max_length=30)
    frequency_days: int | None = Field(default=None, ge=1, le=7)
    active: int | None = Field(default=None, ge=0, le=1)


class HabitCompletionRequest(BaseModel):
    date: dt_date | None = None
    completed: bool = True
    current_value: float | None = Field(default=None, ge=0, le=10000)
    note: str = Field(default="", max_length=500)


class StrengthGoalCreateRequest(BaseModel):
    exercise_name: str = Field(min_length=2, max_length=160)
    base_weight_kg: float = Field(ge=0, le=500)
    target_weight_kg: float = Field(ge=0, le=500)
    target_reps: int = Field(default=8, ge=1, le=50)
    increment_kg: float = Field(default=2.5, ge=0.5, le=25)
    target_date: dt_date | None = None


class StrengthGoalUpdateRequest(BaseModel):
    exercise_name: str | None = Field(default=None, min_length=2, max_length=160)
    base_weight_kg: float | None = Field(default=None, ge=0, le=500)
    target_weight_kg: float | None = Field(default=None, ge=0, le=500)
    target_reps: int | None = Field(default=None, ge=1, le=50)
    increment_kg: float | None = Field(default=None, ge=0.5, le=25)
    target_date: dt_date | None = None
    status: StrengthStatus | None = None


class StrengthLogRequest(BaseModel):
    weight_kg: float = Field(ge=0, le=500)
    reps: int = Field(ge=1, le=100)
    sets: int = Field(default=1, ge=1, le=20)
    rir: int | None = Field(default=None, ge=0, le=10)
    note: str = Field(default="", max_length=500)


def _today() -> dt_date:
    return dt_date.today()



def _period_bounds(period: PeriodFilter | None) -> tuple[dt_date, dt_date, datetime, datetime, float]:
    clean_period = period or "30d"
    today = _today()
    if clean_period == "all":
        start = dt_date(1970, 1, 1)
        end = today
    elif clean_period == "current_month":
        start = today.replace(day=1)
        end = today
    elif clean_period == "previous_month":
        current_month_start = today.replace(day=1)
        end = current_month_start - timedelta(days=1)
        start = end.replace(day=1)
    else:
        days_by_period = {"7d": 7, "30d": 30, "60d": 60, "90d": 90, "180d": 180, "365d": 365}
        days = days_by_period.get(clean_period, 30)
        start = today - timedelta(days=days - 1)
        end = today
    start_dt = datetime.combine(start, time.min)
    end_dt = datetime.combine(end + timedelta(days=1), time.min)
    period_days = max(1, (end - start).days + 1)
    # Convierte frecuencia semanal de hábitos a una meta proporcional al periodo filtrado.
    period_multiplier = max(1.0, period_days / 7)
    return start, end, start_dt, end_dt, period_multiplier



def _period_label(period: PeriodFilter | str | None) -> str:
    labels = {
        "7d": "semanal",
        "30d": "últimos 30 días",
        "current_month": "este mes",
        "previous_month": "mes pasado",
        "60d": "2 meses",
        "90d": "trimestral",
        "180d": "semestral",
        "365d": "anual",
        "all": "todo el historial",
    }
    return labels.get(str(period or "7d"), "periodo")

def _period_day_label(day: dt_date, period_days: int) -> str:
    if period_days <= 7:
        return ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][day.weekday()]
    if day.day == 1 or period_days <= 31:
        return day.strftime("%d/%m")
    return str(day.day)

def _rows_to_dicts(rows):
    return [dict(row) for row in rows]


def _as_iso(value):
    if value is None:
        return None
    if isinstance(value, dt_date):
        return value.isoformat()
    return str(value)[:10]


def _require_active_client(current_user: User) -> None:
    if current_user.status != "active":
        raise HTTPException(status_code=403, detail="Cuenta pendiente o inactiva")


def _get_habit(db: Session, habit_id: int, user_id: int):
    habit = db.execute(
        text("select * from public.user_habits where id = :id and user_id = :user_id"),
        {"id": habit_id, "user_id": user_id},
    ).mappings().first()
    if not habit:
        raise HTTPException(status_code=404, detail="Hábito no encontrado")
    return habit


def _get_strength_goal(db: Session, goal_id: int, user_id: int):
    goal = db.execute(
        text("select * from public.strength_goals where id = :id and user_id = :user_id"),
        {"id": goal_id, "user_id": user_id},
    ).mappings().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta de fuerza no encontrada")
    return goal


def _progress_percent(goal: dict) -> int:
    base = float(goal.get("base_weight_kg") or 0)
    current = float(goal.get("current_weight_kg") or base)
    target = float(goal.get("target_weight_kg") or base)
    if target <= base:
        return 100 if current >= target else 0
    return max(0, min(100, round(((current - base) / (target - base)) * 100)))


def _recalculate_habit_streaks(db: Session, user_id: int, category: str | None = None) -> None:
    all_rows = db.execute(
        text(
            """
            select distinct completion_date
            from public.habit_completions
            where user_id = :user_id and completed = 1
            order by completion_date asc
            """
        ),
        {"user_id": user_id},
    ).mappings().all()
    all_dates = [dt_date.fromisoformat(_as_iso(row["completion_date"])) for row in all_rows]
    recalculate_streak_from_dates(db, user_id, "habit_consistency", all_dates)

    if category:
        streak_type = STREAK_BY_CATEGORY.get(category)
        if streak_type and streak_type != "habit_consistency":
            rows = db.execute(
                text(
                    """
                    select distinct hc.completion_date
                    from public.habit_completions hc
                    join public.user_habits h on h.id = hc.habit_id
                    where hc.user_id = :user_id
                      and hc.completed = 1
                      and h.category = :category
                    order by hc.completion_date asc
                    """
                ),
                {"user_id": user_id, "category": category},
            ).mappings().all()
            recalculate_streak_from_dates(db, user_id, streak_type, [dt_date.fromisoformat(_as_iso(row["completion_date"])) for row in rows])


def _active_habits(db: Session, user_id: int):
    return db.execute(
        text(
            """
            select *
            from public.user_habits
            where user_id = :user_id and active = 1
            order by sort_order asc, created_at asc
            """
        ),
        {"user_id": user_id},
    ).mappings().all()


def _daily_missions(db: Session, user_id: int) -> list[dict]:
    today = _today()
    completions = {
        row["habit_id"]: row
        for row in db.execute(
            text(
                """
                select habit_id, current_value, completed
                from public.habit_completions
                where user_id = :user_id and completion_date = :today
                """
            ),
            {"user_id": user_id, "today": today},
        ).mappings().all()
    }
    missions: list[dict] = []
    for habit in _active_habits(db, user_id):
        xp, coins = XP_BY_CATEGORY.get(habit["category"], (5, 1))
        completion = completions.get(habit["id"])
        current_value = float(completion["current_value"] if completion and completion["current_value"] is not None else 0)
        completed = bool(completion and completion["completed"] == 1)
        target_type = habit["target_type"]
        target_value = float(habit["target_value"] or 1)
        if completion and target_type != "boolean":
            completed = current_value >= target_value
        missions.append(
            {
                "key": f"habit_{habit['id']}",
                "habit_id": habit["id"],
                "title": habit["title"],
                "category": habit["category"],
                "target_type": target_type,
                "target_value": target_value,
                "unit": habit["unit"],
                "current_value": current_value,
                "xp": xp,
                "coins": coins,
                "completed": completed,
                "editable": True,
            }
        )
    return missions


def _habits_with_state(db: Session, user_id: int, period: PeriodFilter = "7d") -> list[dict]:
    today = _today()
    period_start, period_end, _period_start_dt, _period_end_dt, period_multiplier = _period_bounds(period)
    period_days_count = max(1, (period_end - period_start).days + 1)
    period_days = [period_start + timedelta(days=i) for i in range(period_days_count)]

    rows = db.execute(
        text(
            """
            select h.*,
              coalesce(today.completed, 0) as completed_today,
              coalesce(today.current_value, 0) as current_value_today,
              coalesce(period.completed_count, 0) as weekly_completed
            from public.user_habits h
            left join public.habit_completions today
              on today.habit_id = h.id and today.user_id = h.user_id and today.completion_date = :today
            left join (
              select habit_id, count(*) as completed_count
              from public.habit_completions
              where user_id = :user_id and completed = 1 and completion_date >= :period_start and completion_date <= :period_end
              group by habit_id
            ) period on period.habit_id = h.id
            where h.user_id = :user_id
            order by h.active desc, h.sort_order asc, h.created_at asc
            """
        ),
        {"user_id": user_id, "today": today, "period_start": period_start, "period_end": period_end},
    ).mappings().all()

    habit_ids = [int(row["id"]) for row in rows]
    completions_by_habit: dict[int, list[dict]] = {habit_id: [] for habit_id in habit_ids}
    if habit_ids:
        streak_start = today - timedelta(days=max(120, period_days_count))
        completion_rows = db.execute(
            text(
                """
                select habit_id, completion_date, current_value, completed
                from public.habit_completions
                where user_id = :user_id
                  and completed = 1
                  and completion_date >= :streak_start
                order by completion_date asc
                """
            ),
            {"user_id": user_id, "streak_start": streak_start},
        ).mappings().all()
        for entry in completion_rows:
            completions_by_habit.setdefault(int(entry["habit_id"]), []).append(dict(entry))

    output: list[dict] = []
    for row in rows:
        habit_id = int(row["id"])
        current_streak = 0
        date_set: set[dt_date] = set()
        values_by_date: dict[dt_date, float] = {}
        for entry in completions_by_habit.get(habit_id, []):
            entry_date = dt_date.fromisoformat(_as_iso(entry["completion_date"]))
            date_set.add(entry_date)
            values_by_date[entry_date] = float(entry.get("current_value") or 0)

        if date_set:
            anchor = today if today in date_set else today - timedelta(days=1)
            cursor = anchor
            while cursor in date_set:
                current_streak += 1
                cursor -= timedelta(days=1)

        item = dict(row)
        item["completed_today"] = bool(item.pop("completed_today", 0))
        item["current_value_today"] = float(item.get("current_value_today") or 0)
        item["current_streak"] = current_streak
        item["weekly_completed"] = int(item.get("weekly_completed") or 0)
        item["period_target"] = max(1, round(float(item.get("frequency_days") or 7) * period_multiplier))
        item["weekly_grid"] = [
            {
                "date": day.isoformat(),
                "label": _period_day_label(day, period_days_count),
                "completed": day in date_set,
                "current_value": values_by_date.get(day, 0),
                "is_today": day == today,
            }
            for day in period_days
        ]
        output.append(item)
    return output

def _weekly_summary(db: Session, user_id: int, period: PeriodFilter = "7d") -> dict:
    period_start, period_end, _period_start_dt, _period_end_dt, period_multiplier = _period_bounds(period)
    period_days_count = max(1, (period_end - period_start).days + 1)
    days = [period_start + timedelta(days=i) for i in range(period_days_count)]
    habit_stats = db.execute(
        text(
            """
            select count(*) as active_count,
                   coalesce(sum(frequency_days), 0) as weekly_target
            from public.user_habits
            where user_id = :user_id and active = 1
            """
        ),
        {"user_id": user_id},
    ).mappings().first()
    active_count = int((habit_stats or {}).get("active_count") or 0)
    weekly_base_target = float((habit_stats or {}).get("weekly_target") or 0)
    period_target = round(weekly_base_target * period_multiplier) if weekly_base_target else 0

    rows = db.execute(
        text(
            """
            select completion_date, count(distinct habit_id) as completed
            from public.habit_completions
            where user_id = :user_id and completed = 1 and completion_date >= :period_start and completion_date <= :period_end
            group by completion_date
            """
        ),
        {"user_id": user_id, "period_start": period_start, "period_end": period_end},
    ).mappings().all()
    done_by_day = {dt_date.fromisoformat(_as_iso(row["completion_date"])): int(row["completed"] or 0) for row in rows}
    raw_completed = sum(done_by_day.get(day, 0) for day in days)
    completed_slots = min(period_target, raw_completed) if period_target else 0
    return {
        "period": period,
        "period_label": _period_label(period),
        "week_start": period_start.isoformat(),
        "week_end": period_end.isoformat(),
        "total_habit_slots": period_target,
        "completed_habit_slots": completed_slots,
        "remaining_habit_slots": max(0, period_target - completed_slots),
        "completion_percent": round((completed_slots / period_target) * 100) if period_target else 0,
        "days": [
            {
                "date": day.isoformat(),
                "label": _period_day_label(day, period_days_count),
                "completed": min(active_count, done_by_day.get(day, 0)),
                "total": active_count,
                "percent": round((min(active_count, done_by_day.get(day, 0)) / active_count) * 100) if active_count else 0,
            }
            for day in days
        ],
    }

def _strength_goals(db: Session, user_id: int, period: PeriodFilter = "30d") -> list[dict]:
    _period_start, _period_end, period_start_dt, period_end_dt, _period_multiplier = _period_bounds(period)
    rows = db.execute(
        text(
            """
            select sg.*,
              last_log.next_weight_kg,
              last_log.reps as last_reps,
              last_log.created_at as last_logged_at,
              last_log.suggestion
            from public.strength_goals sg
            left join lateral (
              select next_weight_kg, reps, created_at, suggestion
              from public.strength_goal_logs
              where goal_id = sg.id and user_id = sg.user_id
              order by created_at desc
              limit 1
            ) last_log on true
            where sg.user_id = :user_id and sg.status <> 'paused'
            order by sg.status asc, sg.created_at asc
            """
        ),
        {"user_id": user_id},
    ).mappings().all()
    output = []
    goal_ids = [int(row["id"]) for row in rows]
    logs_by_goal: dict[int, list[dict]] = {goal_id: [] for goal_id in goal_ids}
    if goal_ids:
        log_rows = db.execute(
            text(
                """
                select id, user_id, goal_id, exercise_name, weight_kg, reps, sets, rir,
                       next_weight_kg, deload_recommended, suggestion, created_at
                from public.strength_goal_logs
                where user_id = :user_id
                  and created_at >= :period_start_dt
                  and created_at < :period_end_dt
                order by created_at asc
                """
            ),
            {"user_id": user_id, "period_start_dt": period_start_dt, "period_end_dt": period_end_dt},
        ).mappings().all()
        for row in log_rows:
            logs_by_goal.setdefault(int(row["goal_id"]), []).append(dict(row))

    for row in rows:
        item = dict(row)
        item["progress_percent"] = _progress_percent(item)
        item["target_date"] = _as_iso(item.get("target_date"))
        item["period_logs"] = logs_by_goal.get(int(item["id"]), [])
        output.append(item)
    return output

@router.get("/me")
def get_my_gamification(
    period: PeriodFilter = Query(default="7d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_gamification_status(db, current_user.id)
    sync_daily_checkin_history_to_habits(db, current_user.id)
    db.commit()

    status = db.execute(
        text(
            """
            select user_id, xp, level, prestige, imperial_coins, streak_shields, title, updated_at
            from public.user_gamification_status
            where user_id = :user_id
            """
        ),
        {"user_id": current_user.id},
    ).mappings().first()

    streaks = db.execute(
        text(
            """
            select streak_type, current_count, best_count, last_date, shields_used, updated_at
            from public.user_streaks
            where user_id = :user_id
            order by current_count desc, streak_type asc
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    badges = db.execute(
        text(
            """
            select badge_key, title, description, tier, earned_at
            from public.user_badges
            where user_id = :user_id
            order by earned_at desc
            limit 12
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    events = db.execute(
        text(
            """
            select event_key, points, coins, reason, created_at
            from public.xp_events
            where user_id = :user_id
            order by created_at desc
            limit 10
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    notifications = db.execute(
        text(
            """
            select id, type, title, message, created_at
            from public.gamification_notifications
            where user_id = :user_id and read_at is null
            order by created_at desc
            limit 5
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    return {
        "status": dict(status) if status else {},
        "streaks": [
            {**dict(row), "label": STREAK_LABELS.get(row["streak_type"], row["streak_type"]), "last_date": _as_iso(row["last_date"])}
            for row in streaks
        ],
        "badges": _rows_to_dicts(badges),
        "recent_events": _rows_to_dicts(events),
        "notifications": _rows_to_dicts(notifications),
        "daily_missions": _daily_missions(db, current_user.id),
        "habits": _habits_with_state(db, current_user.id, period),
        "strength_goals": _strength_goals(db, current_user.id, period),
        "weekly_summary": _weekly_summary(db, current_user.id, period),
    }


@router.post("/action")
def register_gamification_action(
    payload: GamificationActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_active_client(current_user)
    today = _today()
    kind = payload.kind
    status = payload.status

    # Mantiene compatibilidad con botones antiguos, pero también actualiza hábitos reales si existe un hábito de esa categoría.
    if status == "completed":
        update_streak(db, current_user.id, kind, True, today)
        xp_map = {"water": 5, "sleep": 5, "mental": 5, "progress": 20}
        coin_map = {"water": 1, "sleep": 1, "mental": 1, "progress": 5}
        if complete_mission_once(db, current_user.id, f"{kind}_today", today):
            award_xp_once(db, current_user.id, xp_map[kind], f"Misión diaria: {STREAK_LABELS.get(kind, kind)}", f"mission:{kind}_today:{today}", coin_map[kind])
        habit = db.execute(
            text(
                """
                select id, target_value, target_type
                from public.user_habits
                where user_id = :user_id and active = 1 and category = :category
                order by sort_order asc
                limit 1
                """
            ),
            {"user_id": current_user.id, "category": kind},
        ).mappings().first()
        if habit:
            db.execute(
                text(
                    """
                    insert into public.habit_completions (user_id, habit_id, completion_date, completed, current_value, note)
                    values (:user_id, :habit_id, :today, 1, :current_value, :note)
                    on conflict (user_id, habit_id, completion_date)
                    do update set completed = 1, current_value = excluded.current_value, note = excluded.note, updated_at = now()
                    """
                ),
                {"user_id": current_user.id, "habit_id": habit["id"], "today": today, "current_value": habit["target_value"] or 1, "note": payload.notes},
            )
            _recalculate_habit_streaks(db, current_user.id, kind)
    elif status == "partial":
        award_xp_once(db, current_user.id, 2, f"{STREAK_LABELS.get(kind, kind)} parcial", f"{kind}_partial:{today}", 0)
    else:
        update_streak(db, current_user.id, kind, False, today)

    db.commit()
    return {"ok": True}


@router.post("/habits")
def create_habit(payload: HabitCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    sort_order = int(db.execute(text("select coalesce(max(sort_order), 0) + 1 from public.user_habits where user_id = :user_id"), {"user_id": current_user.id}).scalar() or 1)
    row = db.execute(
        text(
            """
            insert into public.user_habits
              (user_id, title, category, target_type, target_value, unit, frequency_days, sort_order, active, is_default)
            values
              (:user_id, :title, :category, :target_type, :target_value, :unit, :frequency_days, :sort_order, 1, 0)
            returning *
            """
        ),
        {**payload.model_dump(), "user_id": current_user.id, "sort_order": sort_order},
    ).mappings().first()
    db.commit()
    return dict(row)


@router.put("/habits/{habit_id}")
def update_habit(habit_id: int, payload: HabitUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    _get_habit(db, habit_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return dict(_get_habit(db, habit_id, current_user.id))
    allowed = {"title", "category", "target_type", "target_value", "unit", "frequency_days", "active"}
    assignments = [f"{field} = :{field}" for field in updates if field in allowed]
    params = {**updates, "id": habit_id, "user_id": current_user.id}
    row = db.execute(
        text(
            f"""
            update public.user_habits
            set {', '.join(assignments)}, updated_at = now()
            where id = :id and user_id = :user_id
            returning *
            """
        ),
        params,
    ).mappings().first()
    db.commit()
    return dict(row)


@router.delete("/habits/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    _get_habit(db, habit_id, current_user.id)
    db.execute(text("update public.user_habits set active = 0, updated_at = now() where id = :id and user_id = :user_id"), {"id": habit_id, "user_id": current_user.id})
    db.commit()
    return {"ok": True}


@router.post("/habits/{habit_id}/completion")
def set_habit_completion(habit_id: int, payload: HabitCompletionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    habit = _get_habit(db, habit_id, current_user.id)
    day = payload.date or _today()
    current_value = payload.current_value if payload.current_value is not None else float(habit["target_value"] or 1)

    target_value = float(habit["target_value"] or 1)
    is_completed = bool(payload.completed)
    if payload.completed and habit["target_type"] != "boolean":
        is_completed = current_value >= target_value

    if payload.completed:
        db.execute(
            text(
                """
                insert into public.habit_completions (user_id, habit_id, completion_date, completed, current_value, note)
                values (:user_id, :habit_id, :completion_date, :completed, :current_value, :note)
                on conflict (user_id, habit_id, completion_date)
                do update set completed = excluded.completed, current_value = excluded.current_value, note = excluded.note, updated_at = now()
                """
            ),
            {"user_id": current_user.id, "habit_id": habit_id, "completion_date": day, "completed": 1 if is_completed else 0, "current_value": current_value, "note": payload.note},
        )
        if is_completed:
            xp, coins = XP_BY_CATEGORY.get(habit["category"], (5, 1))
            award_xp_once(db, current_user.id, xp, f"Hábito completado: {habit['title']}", f"habit:{habit_id}:{day}", coins)
            if habit["category"] == "gym":
                award_badge(db, current_user.id, "gym_habit_started", "Ruta de fuerza activada", "Registraste constancia en tus hábitos de gimnasio.", "bronze")
    else:
        db.execute(
            text("delete from public.habit_completions where user_id = :user_id and habit_id = :habit_id and completion_date = :completion_date"),
            {"user_id": current_user.id, "habit_id": habit_id, "completion_date": day},
        )

    _recalculate_habit_streaks(db, current_user.id, habit["category"])
    db.commit()
    return {"ok": True}


@router.post("/strength-goals")
def create_strength_goal(payload: StrengthGoalCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    current_weight = payload.base_weight_kg
    row = db.execute(
        text(
            """
            insert into public.strength_goals
              (user_id, exercise_name, base_weight_kg, current_weight_kg, target_weight_kg, target_reps, increment_kg, target_date, status)
            values
              (:user_id, :exercise_name, :base_weight_kg, :current_weight_kg, :target_weight_kg, :target_reps, :increment_kg, :target_date, 'active')
            returning *
            """
        ),
        {**payload.model_dump(), "user_id": current_user.id, "current_weight_kg": current_weight},
    ).mappings().first()
    award_xp_once(db, current_user.id, 10, f"Meta de fuerza creada: {payload.exercise_name}", f"strength_goal:{row['id']}", 2)
    db.commit()
    item = dict(row)
    item["progress_percent"] = _progress_percent(item)
    return item


@router.put("/strength-goals/{goal_id}")
def update_strength_goal(goal_id: int, payload: StrengthGoalUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    _get_strength_goal(db, goal_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        item = dict(_get_strength_goal(db, goal_id, current_user.id))
        item["progress_percent"] = _progress_percent(item)
        return item
    allowed = {"exercise_name", "base_weight_kg", "target_weight_kg", "target_reps", "increment_kg", "target_date", "status"}
    assignments = [f"{field} = :{field}" for field in updates if field in allowed]
    row = db.execute(
        text(
            f"""
            update public.strength_goals
            set {', '.join(assignments)}, updated_at = now()
            where id = :id and user_id = :user_id
            returning *
            """
        ),
        {**updates, "id": goal_id, "user_id": current_user.id},
    ).mappings().first()
    db.commit()
    item = dict(row)
    item["progress_percent"] = _progress_percent(item)
    return item


@router.delete("/strength-goals/{goal_id}")
def delete_strength_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    _get_strength_goal(db, goal_id, current_user.id)
    db.execute(text("update public.strength_goals set status = 'paused', updated_at = now() where id = :id and user_id = :user_id"), {"id": goal_id, "user_id": current_user.id})
    db.commit()
    return {"ok": True}


@router.post("/strength-goals/{goal_id}/logs")
def log_strength_goal(goal_id: int, payload: StrengthLogRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_active_client(current_user)
    goal = _get_strength_goal(db, goal_id, current_user.id)
    next_weight, deload, suggestion = progression_from_strength_log(payload.weight_kg, payload.reps, int(goal["target_reps"] or 8), float(goal["increment_kg"] or 2.5), payload.rir)
    row = db.execute(
        text(
            """
            insert into public.strength_goal_logs
              (user_id, goal_id, exercise_name, weight_kg, reps, sets, rir, note, next_weight_kg, deload_recommended, suggestion)
            values
              (:user_id, :goal_id, :exercise_name, :weight_kg, :reps, :sets, :rir, :note, :next_weight_kg, :deload_recommended, :suggestion)
            returning *
            """
        ),
        {
            "user_id": current_user.id,
            "goal_id": goal_id,
            "exercise_name": goal["exercise_name"],
            "weight_kg": payload.weight_kg,
            "reps": payload.reps,
            "sets": payload.sets,
            "rir": payload.rir,
            "note": payload.note,
            "next_weight_kg": next_weight,
            "deload_recommended": 1 if deload else 0,
            "suggestion": suggestion,
        },
    ).mappings().first()

    new_current = max(float(goal["current_weight_kg"] or 0), payload.weight_kg)
    new_status = "completed" if new_current >= float(goal["target_weight_kg"] or 0) and payload.reps >= int(goal["target_reps"] or 1) else goal["status"]
    db.execute(
        text(
            """
            update public.strength_goals
            set current_weight_kg = :current_weight_kg,
                status = :status,
                updated_at = now()
            where id = :id and user_id = :user_id
            """
        ),
        {"current_weight_kg": new_current, "status": new_status, "id": goal_id, "user_id": current_user.id},
    )

    today = _today()
    award_xp_once(db, current_user.id, 15, f"Carga registrada: {goal['exercise_name']}", f"strength_log:{goal_id}:{today}", 3)
    update_streak(db, current_user.id, "strength", True, today)
    if new_status == "completed":
        award_xp_once(db, current_user.id, 80, f"Meta de fuerza completada: {goal['exercise_name']}", f"strength_goal_completed:{goal_id}", 20)
        award_badge(db, current_user.id, f"strength_goal_{goal_id}", f"Meta lograda: {goal['exercise_name']}", "Completaste una progresión de fuerza del Camino Imperial.", "gold")

    db.commit()
    return dict(row)


@router.post("/reprocess-checkin-today")
def reprocess_today_checkin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        text(
            """
            select training_status, nutrition_status, checkin_date
            from public.daily_checkins
            where user_id = :user_id and checkin_date = current_date
            limit 1
            """
        ),
        {"user_id": current_user.id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No hay check-in de hoy")
    process_daily_checkin(db, current_user.id, row["training_status"], row["nutrition_status"], row["checkin_date"])
    return {"ok": True}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        text(
            """
            update public.gamification_notifications
            set read_at = now()
            where id = :id and user_id = :user_id
            """
        ),
        {"id": notification_id, "user_id": current_user.id},
    )
    db.commit()
    return {"ok": True}


@router.get("/admin/summary")
def admin_gamification_summary(
    period: PeriodFilter = Query(default="30d"),
    limit: int = Query(default=600, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    # Resumen operativo optimizado para 500+ usuarios: agrega hábitos, cargas y check-ins
    # en bloques por usuario para evitar subconsultas repetidas por cada cliente.
    period_start, period_end, period_start_dt, period_end_dt, period_multiplier = _period_bounds(period)
    trainer_filter = "and u.assigned_trainer_id = :trainer_id" if current_user.role == "trainer" else ""
    query = f"""
        with clients as (
          select u.id, u.name, u.email, u.phone_number, u.whatsapp_opt_in
          from public.users u
          where u.role = 'client' and u.status = 'active'
          {trainer_filter}
          order by u.name asc
          limit :limit
        ),
        habit_targets as (
          select h.user_id,
                 count(*)::int as active_habits,
                 coalesce(round(sum(h.frequency_days) * :period_multiplier)::int, 0) as weekly_habit_target
          from public.user_habits h
          join clients c on c.id = h.user_id
          where h.active = 1
          group by h.user_id
        ),
        habit_done as (
          select hc.user_id, count(*)::int as weekly_habit_completions
          from public.habit_completions hc
          join clients c on c.id = hc.user_id
          where hc.completed = 1
            and hc.completion_date >= :period_start
            and hc.completion_date <= :period_end
          group by hc.user_id
        ),
        strength_stats as (
          select sg.user_id,
                 count(*) filter (where sg.status <> 'paused')::int as active_strength_goals,
                 count(*) filter (where sg.status = 'completed')::int as completed_strength_goals,
                 coalesce(round(avg(
                   case
                     when sg.status = 'paused' then null
                     when sg.target_weight_kg > sg.base_weight_kg then
                       least(100, greatest(0, ((sg.current_weight_kg - sg.base_weight_kg) / nullif(sg.target_weight_kg - sg.base_weight_kg, 0)) * 100))
                     when sg.current_weight_kg >= sg.target_weight_kg then 100
                     else 0
                   end
                 ))::int, 0) as strength_progress_percent
          from public.strength_goals sg
          join clients c on c.id = sg.user_id
          group by sg.user_id
        ),
        strength_logs as (
          select sgl.user_id,
                 count(*)::int as strength_logs_count,
                 max(sgl.created_at) as last_strength_log_at
          from public.strength_goal_logs sgl
          join clients c on c.id = sgl.user_id
          where sgl.created_at >= :period_start_dt
            and sgl.created_at < :period_end_dt
          group by sgl.user_id
        ),
        checkins as (
          select dc.user_id, max(dc.checkin_date) as last_checkin_date
          from public.daily_checkins dc
          join clients c on c.id = dc.user_id
          where dc.checkin_date >= :period_start
            and dc.checkin_date <= :period_end
          group by dc.user_id
        )
        select
          :period as period,
          :period_start as period_start,
          :period_end as period_end,
          c.id as user_id,
          c.name,
          c.email,
          c.phone_number,
          c.whatsapp_opt_in,
          coalesce(gs.xp, 0) as xp,
          coalesce(gs.level, 1) as level,
          coalesce(gs.title, 'Recluta') as title,
          coalesce(gs.streak_shields, 0) as streak_shields,
          coalesce(ts.current_count, 0) as training_streak,
          coalesce(ns.current_count, 0) as nutrition_streak,
          coalesce(ps.current_count, 0) as perfect_streak,
          coalesce(ht.active_habits, 0) as active_habits,
          coalesce(ht.weekly_habit_target, 0) as weekly_habit_target,
          coalesce(hd.weekly_habit_completions, 0) as weekly_habit_completions,
          coalesce(round((hd.weekly_habit_completions::numeric / nullif(ht.weekly_habit_target, 0)) * 100)::int, 0) as weekly_habit_percent,
          coalesce(ss.active_strength_goals, 0) as active_strength_goals,
          coalesce(ss.completed_strength_goals, 0) as completed_strength_goals,
          coalesce(ss.strength_progress_percent, 0) as strength_progress_percent,
          coalesce(sl.strength_logs_count, 0) as strength_logs_count,
          sl.last_strength_log_at,
          ci.last_checkin_date
        from clients c
        left join public.user_gamification_status gs on gs.user_id = c.id
        left join public.user_streaks ts on ts.user_id = c.id and ts.streak_type = 'training'
        left join public.user_streaks ns on ns.user_id = c.id and ns.streak_type = 'nutrition'
        left join public.user_streaks ps on ps.user_id = c.id and ps.streak_type = 'perfect_day'
        left join habit_targets ht on ht.user_id = c.id
        left join habit_done hd on hd.user_id = c.id
        left join strength_stats ss on ss.user_id = c.id
        left join strength_logs sl on sl.user_id = c.id
        left join checkins ci on ci.user_id = c.id
        order by level desc, xp desc, training_streak desc, c.name asc
    """
    params = {
        "period": period,
        "period_start": period_start,
        "period_end": period_end,
        "period_start_dt": period_start_dt,
        "period_end_dt": period_end_dt,
        "period_multiplier": period_multiplier,
        "limit": limit,
    }
    if current_user.role == "trainer":
        params["trainer_id"] = current_user.id
    rows = db.execute(text(query), params).mappings().all()
    return _rows_to_dicts(rows)
