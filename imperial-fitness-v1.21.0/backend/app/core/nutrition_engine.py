from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

ENGINE_VERSION = "imperial-nutrition-v2.0"

ACTIVITY_FACTORS = {
    "sedentary": 1.20,
    "light": 1.375,
    "moderate": 1.55,
    "very_active": 1.725,
    "athlete": 1.90,
}

ACTIVITY_ALIASES = {
    "sedentario": "sedentary",
    "sedentary": "sedentary",
    "ligero": "light",
    "light": "light",
    "moderado": "moderate",
    "moderate": "moderate",
    "intenso": "very_active",
    "muy activo": "very_active",
    "very_active": "very_active",
    "atleta": "athlete",
    "athlete": "athlete",
}

GOAL_ALIASES = {
    "fat_loss": "fat_loss",
    "perdida de grasa": "fat_loss",
    "pérdida de grasa": "fat_loss",
    "bajar": "fat_loss",
    "definicion": "fat_loss",
    "definición": "fat_loss",
    "weight_loss": "fat_loss",
    "muscle_gain": "muscle_gain",
    "ganancia muscular": "muscle_gain",
    "ganar masa": "muscle_gain",
    "hipertrofia": "muscle_gain",
    "strength": "strength",
    "fuerza": "strength",
    "maintenance": "maintenance",
    "mantenimiento": "maintenance",
    "resistencia": "maintenance",
    "salud sostenible": "maintenance",
    "salud": "maintenance",
    "acondicionamiento": "maintenance",
    "recomposition": "recomposition",
    "recomposicion": "recomposition",
    "recomposición": "recomposition",
    "tonificacion": "recomposition",
    "tonificación": "recomposition",
}

GOAL_ADJUSTMENTS = {
    "fat_loss": -0.15,
    "muscle_gain": 0.08,
    "strength": 0.05,
    "maintenance": 0.0,
    "recomposition": -0.05,
}

GOAL_LABELS = {
    "fat_loss": "Pérdida de grasa",
    "muscle_gain": "Ganancia muscular",
    "strength": "Fuerza y rendimiento",
    "maintenance": "Mantenimiento",
    "recomposition": "Recomposición corporal",
}


class NutritionInputError(ValueError):
    """Raised when a plan cannot be calculated safely from real client data."""


@dataclass(frozen=True)
class NutritionTargets:
    bmr: int
    bmr_source: str
    activity_level: str
    activity_factor: float
    maintenance_calories: int
    adjustment_percent: int
    target_calories: int
    protein_grams: int
    carbs_grams: int
    fat_grams: int
    goal_type: str
    goal_label: str
    formula_version: str
    calculated_at: str
    warnings: list[str]
    inputs: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _required_number(value: Any, field: str, minimum: float, maximum: float) -> float:
    if value is None or value == "":
        raise NutritionInputError(f"Falta {field}; no se generó un cálculo supuesto.")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise NutritionInputError(f"{field} debe ser numérico.") from exc
    if not minimum <= number <= maximum:
        raise NutritionInputError(f"{field} debe estar entre {minimum:g} y {maximum:g}.")
    return number


def normalize_activity_level(value: str | None) -> str:
    key = (value or "").strip().lower().replace("-", "_")
    normalized = ACTIVITY_ALIASES.get(key)
    if not normalized:
        raise NutritionInputError("Falta un nivel de actividad válido; no se asumirá actividad moderada.")
    return normalized


def normalize_goal(value: str | None) -> str:
    raw = (value or "").strip().lower()
    for alias, normalized in GOAL_ALIASES.items():
        if alias in raw:
            return normalized
    raise NutritionInputError("Falta un objetivo válido: pérdida de grasa, mantenimiento, recomposición, fuerza o ganancia muscular.")


def resolve_activity_level(
    activity_level: str | None,
    workouts_per_week: int | None = None,
    average_daily_steps: int | None = None,
    occupation_activity: str | None = None,
) -> str:
    if activity_level:
        return normalize_activity_level(activity_level)

    # This is a deterministic derivation from recorded answers, not a hidden default.
    if workouts_per_week is None and average_daily_steps is None and not occupation_activity:
        raise NutritionInputError("Completa actividad, entrenamientos semanales o pasos diarios.")

    workouts = max(0, min(14, int(workouts_per_week or 0)))
    steps = max(0, min(100_000, int(average_daily_steps or 0)))
    occupation = (occupation_activity or "sedentary").strip().lower()
    score = workouts + (1 if steps >= 6000 else 0) + (2 if steps >= 10_000 else 0)
    if occupation in {"active", "activo", "physical", "fisico", "físico"}:
        score += 2
    elif occupation in {"light", "ligero"}:
        score += 1

    if score <= 1:
        return "sedentary"
    if score <= 3:
        return "light"
    if score <= 6:
        return "moderate"
    if score <= 9:
        return "very_active"
    return "athlete"


def calculate_nutrition_targets(
    *,
    weight_kg: Any,
    height_cm: Any,
    age: Any,
    gender: str | None,
    goal: str | None,
    activity_level: str | None = None,
    workouts_per_week: int | None = None,
    average_daily_steps: int | None = None,
    occupation_activity: str | None = None,
    body_fat_percent: Any | None = None,
    inbody_bmr: Any | None = None,
    bmr_source: str | None = None,
) -> NutritionTargets:
    weight = _required_number(weight_kg, "peso", 20, 300)
    height = _required_number(height_cm, "estatura", 120, 250)
    age_value = int(_required_number(age, "edad", 10, 100))
    sex = (gender or "").strip().upper()
    if sex not in {"M", "F"}:
        raise NutritionInputError("Falta sexo biológico M/F requerido por la fórmula Mifflin-St Jeor.")
    if age_value < 18:
        raise NutritionInputError("Los menores de 18 años requieren valoración profesional; no se generó un déficit o superávit automático.")

    normalized_activity = resolve_activity_level(activity_level, workouts_per_week, average_daily_steps, occupation_activity)
    normalized_goal = normalize_goal(goal)
    warnings: list[str] = []

    metric_bmr: float | None = None
    if inbody_bmr not in {None, ""}:
        metric_bmr = _required_number(inbody_bmr, "TMB de InBody", 500, 6000)

    source = (bmr_source or "").strip().lower()
    if metric_bmr is not None and source in {"inbody", "measured", "manual_inbody"}:
        bmr = round(metric_bmr)
        resolved_source = "inbody"
    elif metric_bmr is not None and not source:
        # Existing records did not store source. Preserve them but label honestly.
        bmr = round(metric_bmr)
        resolved_source = "recorded_bmr"
        warnings.append("La TMB estaba registrada sin fuente; confirma que proviene de InBody antes de publicarla como tal.")
    else:
        sex_constant = -161 if sex == "F" else 5
        bmr = round((10 * weight) + (6.25 * height) - (5 * age_value) + sex_constant)
        resolved_source = "mifflin_st_jeor"

    factor = ACTIVITY_FACTORS[normalized_activity]
    maintenance = round(bmr * factor)
    adjustment = GOAL_ADJUSTMENTS[normalized_goal]
    target = round(maintenance * (1 + adjustment))

    # Conservative lower guard, surfaced as a warning rather than hidden.
    minimum = 1200 if sex == "F" else 1500
    if normalized_goal in {"fat_loss", "recomposition"} and target < minimum:
        target = minimum
        warnings.append(f"El objetivo fue limitado a {minimum} kcal para evitar una prescripción automática excesivamente baja.")

    if body_fat_percent not in {None, ""}:
        body_fat = _required_number(body_fat_percent, "porcentaje de grasa", 2, 70)
        lean_mass = weight * (1 - body_fat / 100)
    else:
        body_fat = None
        lean_mass = weight
        warnings.append("Sin porcentaje de grasa corporal, la proteína se estimó usando el peso total.")

    protein_factor = {
        "fat_loss": 2.0,
        "recomposition": 1.9,
        "muscle_gain": 1.8,
        "strength": 1.8,
        "maintenance": 1.6,
    }[normalized_goal]
    protein = round(max(weight * protein_factor, lean_mass * (2.2 if normalized_goal == "fat_loss" else 1.8)))
    protein = min(protein, round(weight * 2.4))

    fat = round(max(weight * 0.8, (target * 0.25) / 9))
    remaining = target - (protein * 4) - (fat * 9)
    if remaining < 200:
        fat = max(round(weight * 0.7), round((target - protein * 4 - 200) / 9))
        remaining = target - (protein * 4) - (fat * 9)
    carbs = max(50, round(remaining / 4))

    macro_calories = protein * 4 + carbs * 4 + fat * 9
    if abs(macro_calories - target) > 20:
        carbs = max(50, carbs + round((target - macro_calories) / 4))

    return NutritionTargets(
        bmr=bmr,
        bmr_source=resolved_source,
        activity_level=normalized_activity,
        activity_factor=factor,
        maintenance_calories=maintenance,
        adjustment_percent=round(adjustment * 100),
        target_calories=target,
        protein_grams=protein,
        carbs_grams=carbs,
        fat_grams=fat,
        goal_type=normalized_goal,
        goal_label=GOAL_LABELS[normalized_goal],
        formula_version=ENGINE_VERSION,
        calculated_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        warnings=warnings,
        inputs={
            "weight_kg": weight,
            "height_cm": height,
            "age": age_value,
            "gender": sex,
            "body_fat_percent": body_fat,
            "workouts_per_week": workouts_per_week,
            "average_daily_steps": average_daily_steps,
            "occupation_activity": occupation_activity,
        },
    )
