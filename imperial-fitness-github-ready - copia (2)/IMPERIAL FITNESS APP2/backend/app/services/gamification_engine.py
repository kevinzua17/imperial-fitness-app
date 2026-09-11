from __future__ import annotations

from datetime import date, datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session

LEVEL_TITLES = [
    (50, "Inmortal"),
    (30, "Leyenda Imperial"),
    (20, "Elite Imperial"),
    (15, "Gladiador"),
    (10, "Guerrero"),
    (5, "Discípulo"),
    (1, "Recluta"),
]

STREAK_LABELS = {
    "training": "Racha de entrenamiento",
    "nutrition": "Racha nutricional",
    "water": "Racha de agua",
    "sleep": "Racha de sueño",
    "progress": "Racha de progreso",
    "mental": "Racha mental",
    "perfect_day": "Día Perfecto Imperial",
    "habit_consistency": "Racha de hábitos",
    "strength": "Racha de fuerza",
}


STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]


def _as_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def level_from_xp(xp: int) -> int:
    # Curva simple y estable: cada 250 XP sube un nivel.
    return max(1, min(50, (xp // 250) + 1))


def title_from_level(level: int) -> str:
    for required, title in LEVEL_TITLES:
        if level >= required:
            return title
    return "Recluta"




DEFAULT_IMPERIAL_HABITS = [
    ("Entrenar o cumplir descanso planificado", "training", "boolean", 1, "check", 1),
    ("Tomar 2 litros de agua", "water", "number", 2, "L", 2),
    ("Cumplir proteína del día", "nutrition", "boolean", 1, "check", 3),
    ("Dormir 7-8 horas", "sleep", "boolean", 1, "check", 4),
    ("Movilidad o estiramiento 10 min", "mobility", "minutes", 10, "min", 5),
    ("Registrar carga principal del entrenamiento", "gym", "boolean", 1, "check", 6),
    ("Técnica limpia en ejercicio base", "gym", "boolean", 1, "check", 7),
    ("Cardio suave o 8.000 pasos", "training", "boolean", 1, "check", 8),
]

DEFAULT_STRENGTH_GOALS = [
    ("Sentadilla libre", 60, 70, 8, 2.5),
    ("Press banca", 40, 45, 8, 2.5),
    ("Peso muerto", 70, 80, 6, 5),
]


def ensure_default_habits(db: Session, user_id: int) -> None:
    """Crea hábitos base editables para el usuario sin duplicarlos."""
    existing = db.execute(
        text("select count(*) from public.user_habits where user_id = :user_id"),
        {"user_id": user_id},
    ).scalar()
    if int(existing or 0) > 0:
        return
    for title, category, target_type, target_value, unit, sort_order in DEFAULT_IMPERIAL_HABITS:
        db.execute(
            text(
                """
                insert into public.user_habits
                  (user_id, title, category, target_type, target_value, unit, frequency_days, sort_order, active, is_default)
                values
                  (:user_id, :title, :category, :target_type, :target_value, :unit, 7, :sort_order, 1, 1)
                """
            ),
            {
                "user_id": user_id,
                "title": title,
                "category": category,
                "target_type": target_type,
                "target_value": target_value,
                "unit": unit,
                "sort_order": sort_order,
            },
        )


def ensure_default_strength_goals(db: Session, user_id: int) -> None:
    existing = db.execute(
        text("select count(*) from public.strength_goals where user_id = :user_id"),
        {"user_id": user_id},
    ).scalar()
    if int(existing or 0) > 0:
        return
    for exercise_name, base_weight, target_weight, target_reps, increment in DEFAULT_STRENGTH_GOALS:
        db.execute(
            text(
                """
                insert into public.strength_goals
                  (user_id, exercise_name, base_weight_kg, current_weight_kg, target_weight_kg, target_reps, increment_kg, status)
                values
                  (:user_id, :exercise_name, :base_weight, :base_weight, :target_weight, :target_reps, :increment, 'active')
                """
            ),
            {
                "user_id": user_id,
                "exercise_name": exercise_name,
                "base_weight": base_weight,
                "target_weight": target_weight,
                "target_reps": target_reps,
                "increment": increment,
            },
        )


def progression_from_strength_log(
    current_weight: float,
    reps: int,
    target_reps: int,
    increment_kg: float,
    rir: int | None,
) -> tuple[float, bool, str]:
    """Regla simple de entrenador: sube, mantiene o descarga según reps y RIR."""
    safe_increment = increment_kg if increment_kg > 0 else 2.5
    recovery_left = 2 if rir is None else rir
    if reps >= target_reps and recovery_left >= 2:
        next_weight = round(current_weight + safe_increment, 1)
        return next_weight, False, f"Sube a {next_weight:g} kg en la próxima sesión: cumpliste {reps} reps con margen técnico."
    if reps >= target_reps and recovery_left < 2:
        next_weight = round(current_weight, 1)
        return next_weight, False, f"Mantén {next_weight:g} kg: cumpliste reps, pero el esfuerzo fue alto. Busca mejor técnica o más RIR antes de subir."
    if reps <= max(1, target_reps - 3):
        next_weight = round(max(0, current_weight * 0.95), 1)
        return next_weight, True, f"Descarga recomendada a {next_weight:g} kg: faltaron varias reps. Prioriza rango completo y control."
    next_weight = round(current_weight, 1)
    return next_weight, False, f"Mantén {next_weight:g} kg y busca sumar 1-2 reps antes de aumentar carga."


def recalculate_streak_from_dates(db: Session, user_id: int, streak_type: str, completed_dates: list[date]) -> None:
    ensure_gamification_status(db, user_id)
    unique_dates = sorted(set(completed_dates))
    if not unique_dates:
        db.execute(
            text(
                """
                update public.user_streaks
                set current_count = 0, best_count = 0, last_date = null, updated_at = now()
                where user_id = :user_id and streak_type = :streak_type
                """
            ),
            {"user_id": user_id, "streak_type": streak_type},
        )
        return

    best = 1
    run = 1
    previous = unique_dates[0]
    for day in unique_dates[1:]:
        if day == previous + timedelta(days=1):
            run += 1
        else:
            best = max(best, run)
            run = 1
        previous = day
    best = max(best, run)

    today = date.today()
    allowed_anchor_dates = {today, today - timedelta(days=1)}
    current = 0
    if unique_dates[-1] in allowed_anchor_dates:
        current = 1
        cursor = unique_dates[-1]
        date_set = set(unique_dates)
        while cursor - timedelta(days=1) in date_set:
            current += 1
            cursor -= timedelta(days=1)

    db.execute(
        text(
            """
            update public.user_streaks
            set current_count = :current_count,
                best_count = :best_count,
                last_date = :last_date,
                updated_at = now()
            where user_id = :user_id and streak_type = :streak_type
            """
        ),
        {
            "user_id": user_id,
            "streak_type": streak_type,
            "current_count": current,
            "best_count": best,
            "last_date": unique_dates[-1],
        },
    )

def ensure_gamification_status(db: Session, user_id: int) -> None:
    db.execute(
        text(
            """
            insert into public.user_gamification_status (user_id)
            values (:user_id)
            on conflict (user_id) do nothing
            """
        ),
        {"user_id": user_id},
    )
    for streak_type in STREAK_LABELS:
        db.execute(
            text(
                """
                insert into public.user_streaks (user_id, streak_type)
                values (:user_id, :streak_type)
                on conflict (user_id, streak_type) do nothing
                """
            ),
            {"user_id": user_id, "streak_type": streak_type},
        )
    ensure_default_habits(db, user_id)
    ensure_default_strength_goals(db, user_id)


def notify(db: Session, user_id: int, title: str, message: str, type_: str = "info") -> None:
    db.execute(
        text(
            """
            insert into public.gamification_notifications (user_id, type, title, message)
            values (:user_id, :type, :title, :message)
            """
        ),
        {"user_id": user_id, "type": type_, "title": title, "message": message},
    )


def award_badge(db: Session, user_id: int, badge_key: str, title: str, description: str, tier: str = "bronze") -> None:
    row = db.execute(
        text(
            """
            insert into public.user_badges (user_id, badge_key, title, description, tier)
            values (:user_id, :badge_key, :title, :description, :tier)
            on conflict (user_id, badge_key) do nothing
            returning id
            """
        ),
        {"user_id": user_id, "badge_key": badge_key, "title": title, "description": description, "tier": tier},
    ).first()
    if row:
        notify(db, user_id, f"Insignia desbloqueada: {title}", description, "badge")


def award_xp_once(db: Session, user_id: int, points: int, reason: str, event_key: str, coins: int = 0) -> bool:
    ensure_gamification_status(db, user_id)
    row = db.execute(
        text(
            """
            insert into public.xp_events (user_id, event_key, points, coins, reason)
            values (:user_id, :event_key, :points, :coins, :reason)
            on conflict (user_id, event_key) do nothing
            returning id
            """
        ),
        {"user_id": user_id, "event_key": event_key, "points": points, "coins": coins, "reason": reason},
    ).first()

    if not row:
        return False

    before = db.execute(
        text("select xp, level from public.user_gamification_status where user_id = :user_id"),
        {"user_id": user_id},
    ).mappings().first()
    old_level = int(before["level"] if before else 1)
    old_xp = int(before["xp"] if before else 0)
    new_xp = old_xp + points
    new_level = level_from_xp(new_xp)
    new_title = title_from_level(new_level)

    db.execute(
        text(
            """
            update public.user_gamification_status
            set xp = :xp,
                level = :level,
                title = :title,
                imperial_coins = imperial_coins + :coins,
                updated_at = now()
            where user_id = :user_id
            """
        ),
        {"user_id": user_id, "xp": new_xp, "level": new_level, "title": new_title, "coins": coins},
    )

    if new_level > old_level:
        notify(db, user_id, "Subiste de nivel", f"Ahora eres {new_title} nivel {new_level}.", "level_up")
        award_badge(db, user_id, f"level_{new_level}", f"Nivel {new_level} — {new_title}", "Tu disciplina está subiendo de categoría.", "gold")

    return True


def update_streak(db: Session, user_id: int, streak_type: str, success: bool, activity_date: str | date, allow_shield: bool = True) -> dict:
    ensure_gamification_status(db, user_id)
    current_date = _as_date(activity_date)
    row = db.execute(
        text(
            """
            select id, current_count, best_count, last_date, shields_used
            from public.user_streaks
            where user_id = :user_id and streak_type = :streak_type
            """
        ),
        {"user_id": user_id, "streak_type": streak_type},
    ).mappings().first()

    current_count = int(row["current_count"] if row else 0)
    best_count = int(row["best_count"] if row else 0)
    last_date = row["last_date"] if row else None
    shields_used = int(row["shields_used"] if row else 0)

    if last_date == current_date:
        return {"current_count": current_count, "best_count": best_count, "changed": False}

    if success:
        if last_date == current_date - timedelta(days=1):
            current_count += 1
        else:
            current_count = 1
        best_count = max(best_count, current_count)
        last_date = current_date
    else:
        if allow_shield and current_count > 0:
            shields = db.execute(
                text("select streak_shields from public.user_gamification_status where user_id = :user_id"),
                {"user_id": user_id},
            ).scalar()
            shields = int(shields or 0)
            if shields > 0:
                db.execute(
                    text(
                        """
                        update public.user_gamification_status
                        set streak_shields = streak_shields - 1, updated_at = now()
                        where user_id = :user_id
                        """
                    ),
                    {"user_id": user_id},
                )
                shields_used += 1
                notify(db, user_id, "Escudo Imperial usado", "Tu racha fue protegida por un escudo.", "shield")
            else:
                current_count = 0
                last_date = current_date
        else:
            current_count = 0
            last_date = current_date

    db.execute(
        text(
            """
            update public.user_streaks
            set current_count = :current_count,
                best_count = :best_count,
                last_date = :last_date,
                shields_used = :shields_used,
                updated_at = now()
            where user_id = :user_id and streak_type = :streak_type
            """
        ),
        {
            "user_id": user_id,
            "streak_type": streak_type,
            "current_count": current_count,
            "best_count": best_count,
            "last_date": last_date,
            "shields_used": shields_used,
        },
    )

    label = STREAK_LABELS.get(streak_type, streak_type)
    if success and current_count in STREAK_MILESTONES:
        tier = "gold" if current_count >= 30 else "silver" if current_count >= 14 else "bronze"
        award_badge(
            db,
            user_id,
            f"streak_{streak_type}_{current_count}",
            f"{label}: {current_count} días",
            f"Mantuviste {current_count} días de constancia.",
            tier,
        )
        notify(db, user_id, "Racha en crecimiento", f"{label}: {current_count} días. No rompas la cadena.", "streak")

    return {"current_count": current_count, "best_count": best_count, "changed": True}


def complete_mission_once(db: Session, user_id: int, mission_key: str, mission_date: str | date) -> bool:
    row = db.execute(
        text(
            """
            insert into public.user_mission_logs (user_id, mission_key, mission_date, status)
            values (:user_id, :mission_key, :mission_date, 'completed')
            on conflict (user_id, mission_key, mission_date) do nothing
            returning id
            """
        ),
        {"user_id": user_id, "mission_key": mission_key, "mission_date": _as_date(mission_date)},
    ).first()
    return bool(row)


def sync_daily_checkin_history_to_habits(db: Session, user_id: int) -> None:
    """Backfill idempotente para que los check-ins anteriores aparezcan en Camino Imperial."""
    ensure_default_habits(db, user_id)
    mappings = (
        ("training", "trained"),
        ("nutrition", "completed"),
    )
    for category, completed_status in mappings:
        habit = db.execute(
            text(
                """
                select id, target_value
                from public.user_habits
                where user_id = :user_id and active = 1 and category = :category
                order by sort_order asc, id asc
                limit 1
                """
            ),
            {"user_id": user_id, "category": category},
        ).mappings().first()
        if not habit:
            continue
        status_column = "training_status" if category == "training" else "nutrition_status"
        db.execute(
            text(
                f"""
                insert into public.habit_completions
                  (user_id, habit_id, completion_date, completed, current_value, note)
                select
                  :user_id,
                  :habit_id,
                  checkin_date::date,
                  1,
                  :current_value,
                  'Sincronizado desde historial de check-in'
                from public.daily_checkins
                where user_id = :user_id
                  and {status_column} = :completed_status
                on conflict (user_id, habit_id, completion_date) do nothing
                """
            ),
            {
                "user_id": user_id,
                "habit_id": habit["id"],
                "current_value": float(habit["target_value"] or 1),
                "completed_status": completed_status,
            },
        )


def _sync_checkin_habit_completion(
    db: Session,
    user_id: int,
    category: str,
    completion_date: str,
    completed: bool,
    note: str,
) -> None:
    """Mantiene Camino Imperial alineado con el check-in diario.

    El check-in y el tablero de hábitos antes guardaban datos separados. Esta
    sincronización usa el primer hábito activo de la categoría para que un
    entrenamiento o una nutrición cumplida también aparezcan en los filtros
    mensuales, sin crear registros duplicados.
    """
    habit = db.execute(
        text(
            """
            select id, target_value
            from public.user_habits
            where user_id = :user_id and active = 1 and category = :category
            order by sort_order asc, id asc
            limit 1
            """
        ),
        {"user_id": user_id, "category": category},
    ).mappings().first()
    if not habit:
        return

    if completed:
        db.execute(
            text(
                """
                insert into public.habit_completions
                  (user_id, habit_id, completion_date, completed, current_value, note)
                values
                  (:user_id, :habit_id, :completion_date, 1, :current_value, :note)
                on conflict (user_id, habit_id, completion_date)
                do update set
                  completed = 1,
                  current_value = excluded.current_value,
                  note = excluded.note,
                  updated_at = now()
                """
            ),
            {
                "user_id": user_id,
                "habit_id": habit["id"],
                "completion_date": completion_date,
                "current_value": float(habit["target_value"] or 1),
                "note": note,
            },
        )
    else:
        db.execute(
            text(
                """
                delete from public.habit_completions
                where user_id = :user_id
                  and habit_id = :habit_id
                  and completion_date = :completion_date
                """
            ),
            {"user_id": user_id, "habit_id": habit["id"], "completion_date": completion_date},
        )


def _refresh_habit_consistency_streak(db: Session, user_id: int) -> None:
    rows = db.execute(
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
    dates = [_as_date(row["completion_date"]) for row in rows]
    recalculate_streak_from_dates(db, user_id, "habit_consistency", dates)


def process_daily_checkin(db: Session, user_id: int, training_status: str, nutrition_status: str, checkin_date: str | date) -> None:
    day = _as_date(checkin_date).isoformat()
    ensure_gamification_status(db, user_id)

    if training_status == "trained":
        update_streak(db, user_id, "training", True, day)
        if complete_mission_once(db, user_id, "train_today", day):
            award_xp_once(db, user_id, 10, "Misión diaria: entrenar hoy", f"mission:train_today:{day}", coins=2)
    elif training_status == "missed":
        update_streak(db, user_id, "training", False, day)
    elif training_status == "later":
        award_xp_once(db, user_id, 2, "Planificó entrenamiento más tarde", f"training_later:{day}")
    elif training_status == "rest":
        award_xp_once(db, user_id, 2, "Día de descanso registrado", f"rest_day:{day}")

    if nutrition_status == "completed":
        update_streak(db, user_id, "nutrition", True, day)
        if complete_mission_once(db, user_id, "nutrition_today", day):
            award_xp_once(db, user_id, 10, "Misión diaria: nutrición cumplida", f"mission:nutrition_today:{day}", coins=2)
    elif nutrition_status == "partial":
        award_xp_once(db, user_id, 5, "Alimentación parcial registrada", f"nutrition_partial:{day}", coins=1)
    elif nutrition_status == "missed":
        update_streak(db, user_id, "nutrition", False, day)

    if training_status == "trained" and nutrition_status == "completed":
        result = update_streak(db, user_id, "perfect_day", True, day)
        award_xp_once(db, user_id, 25, "Día Perfecto Imperial", f"perfect_day:{day}", coins=8)
        current = int(result.get("current_count", 0))
        if current > 0 and current % 15 == 0:
            db.execute(
                text(
                    """
                    update public.user_gamification_status
                    set streak_shields = streak_shields + 1, updated_at = now()
                    where user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
            notify(db, user_id, "Ganaste un Escudo Imperial", "15 días perfectos te dieron un escudo para proteger una racha.", "shield")

    _sync_checkin_habit_completion(
        db, user_id, "training", day, training_status == "trained", "Sincronizado desde el check-in diario",
    )
    _sync_checkin_habit_completion(
        db, user_id, "nutrition", day, nutrition_status == "completed", "Sincronizado desde el check-in diario",
    )
    _refresh_habit_consistency_streak(db, user_id)
    db.commit()
