from __future__ import annotations

import json
import math
from typing import Any


def _number(value: Any, field: str) -> float:
    try:
        number = float(value or 0)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} debe ser numérico") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{field} debe ser un número positivo")
    return number


def calculate_meals_totals(meals_json: str) -> dict[str, int]:
    """Calculate totals from real food grams stored in the plan JSON."""
    try:
        meals = json.loads(meals_json or "[]")
    except json.JSONDecodeError as exc:
        raise ValueError("Las comidas deben enviarse como JSON válido") from exc
    if not isinstance(meals, list):
        raise ValueError("Las comidas deben enviarse como una lista")

    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for meal_index, meal in enumerate(meals):
        if not isinstance(meal, dict) or not isinstance(meal.get("items", []), list):
            raise ValueError(f"La comida {meal_index + 1} tiene una estructura inválida")
        for item_index, item in enumerate(meal.get("items", [])):
            if not isinstance(item, dict):
                raise ValueError(f"El alimento {item_index + 1} de la comida {meal_index + 1} es inválido")
            grams = _number(item.get("amountGrams", item.get("amount_grams", 0)), "amountGrams")
            if grams > 5000:
                raise ValueError("La porción de un alimento no puede superar 5000 g")
            ratio = grams / 100.0
            totals["calories"] += ratio * _number(item.get("baseCalsPer100g", item.get("base_cals_per_100g", 0)), "baseCalsPer100g")
            totals["protein"] += ratio * _number(item.get("baseProteinPer100g", item.get("base_protein_per_100g", 0)), "baseProteinPer100g")
            totals["carbs"] += ratio * _number(item.get("baseCarbsPer100g", item.get("base_carbs_per_100g", 0)), "baseCarbsPer100g")
            totals["fat"] += ratio * _number(item.get("baseFatPer100g", item.get("base_fat_per_100g", 0)), "baseFatPer100g")
    return {key: round(value) for key, value in totals.items()}


def validate_meals_nutrition_alignment(
    meals_json: str,
    *,
    target_calories: int | None,
    target_protein: int | None = None,
    target_carbs: int | None = None,
    target_fat: int | None = None,
    calorie_tolerance: float = 0.05,
    protein_tolerance: float = 0.15,
    carbs_tolerance: float = 0.20,
    fat_tolerance: float = 0.20,
    require_full_day: bool = False,
) -> dict[str, int]:
    """Validate that the foods actually prescribed match the declared plan.

    Calories are kept tight for publication. Macro tolerances are intentionally
    wider because food labels and household portions vary, but a plan cannot be
    published when its real protein/carbohydrate/fat totals are materially
    different from the targets shown to the client.
    """
    totals = calculate_meals_totals(meals_json)
    meals = json.loads(meals_json or "[]")
    if require_full_day and len(meals) < 3:
        raise ValueError("Un plan publicado debe incluir al menos 3 comidas.")

    targets = {
        "calories": (target_calories, calorie_tolerance, "calorías", "kcal"),
        "protein": (target_protein, protein_tolerance, "proteína", "g"),
        "carbs": (target_carbs, carbs_tolerance, "carbohidratos", "g"),
        "fat": (target_fat, fat_tolerance, "grasas", "g"),
    }
    for key, (target, tolerance, label, unit) in targets.items():
        if target is None or target <= 0:
            continue
        actual = totals[key]
        if actual <= 0:
            if require_full_day:
                raise ValueError(f"Las comidas no contienen datos suficientes para validar {label}.")
            continue
        deviation = abs(actual - target) / target
        if deviation > tolerance:
            raise ValueError(
                f"Las comidas suman {actual} {unit} de {label} y se desvían "
                f"{round(deviation * 100, 1)}% del objetivo de {target} {unit}."
            )
    return totals


def validate_meals_calorie_alignment(
    meals_json: str,
    target_calories: int | None,
    tolerance: float = 0.05,
    *,
    require_full_day: bool = False,
) -> dict[str, int]:
    """Backward-compatible calorie-only validation used by editable drafts."""
    return validate_meals_nutrition_alignment(
        meals_json,
        target_calories=target_calories,
        calorie_tolerance=tolerance,
        require_full_day=require_full_day,
    )


def rebalance_meals_to_targets(
    meals_json: str,
    *,
    target_calories: int,
    target_protein: int,
    target_carbs: int,
    target_fat: int,
    max_passes: int = 40,
) -> tuple[str, dict[str, int], int]:
    """Rebalance real food grams against calories and all three macros.

    The optimizer never changes food names, nutrition labels, meal order or the
    number of meals. It only adjusts `amountGrams` within conservative bounds.
    A weighted coordinate-descent step is used so the exact same food data that
    the validator reads is also what gets corrected.
    """
    try:
        meals = json.loads(meals_json or "[]")
    except json.JSONDecodeError as exc:
        raise ValueError("Las comidas deben enviarse como JSON válido") from exc
    if not isinstance(meals, list) or len(meals) < 3:
        raise ValueError("Un plan publicado debe incluir al menos 3 comidas.")

    targets = {
        "calories": float(target_calories),
        "protein": float(target_protein),
        "carbs": float(target_carbs),
        "fat": float(target_fat),
    }
    if any(value <= 0 for value in targets.values()):
        raise ValueError("Las metas nutricionales deben ser mayores que cero para equilibrar el plan.")

    tolerances = {"calories": 0.05, "protein": 0.15, "carbs": 0.20, "fat": 0.20}
    weights = {key: 1.0 / (value * value) for key, value in tolerances.items()}
    nutrients = ("calories", "protein", "carbs", "fat")

    entries: list[dict[str, Any]] = []
    for meal_index, meal in enumerate(meals):
        if not isinstance(meal, dict) or not isinstance(meal.get("items", []), list):
            raise ValueError(f"La comida {meal_index + 1} tiene una estructura inválida")
        for item_index, item in enumerate(meal.get("items", [])):
            if not isinstance(item, dict):
                raise ValueError(f"El alimento {item_index + 1} de la comida {meal_index + 1} es inválido")
            grams_key = "amountGrams" if "amountGrams" in item else "amount_grams"
            grams = _number(item.get(grams_key, 0), "amountGrams")
            per_gram = {
                "calories": _number(item.get("baseCalsPer100g", item.get("base_cals_per_100g", 0)), "baseCalsPer100g") / 100.0,
                "protein": _number(item.get("baseProteinPer100g", item.get("base_protein_per_100g", 0)), "baseProteinPer100g") / 100.0,
                "carbs": _number(item.get("baseCarbsPer100g", item.get("base_carbs_per_100g", 0)), "baseCarbsPer100g") / 100.0,
                "fat": _number(item.get("baseFatPer100g", item.get("base_fat_per_100g", 0)), "baseFatPer100g") / 100.0,
            }
            entries.append({
                "item": item,
                "grams_key": grams_key,
                "original": grams,
                "per_gram": per_gram,
                "category": str(item.get("category") or "").lower(),
            })

    if not entries:
        raise ValueError("El plan no contiene alimentos para equilibrar.")

    def bounds(entry: dict[str, Any]) -> tuple[float, float]:
        category = entry["category"]
        if category == "fat":
            return 3.0, 120.0
        if category == "protein":
            return 40.0, 450.0
        if category == "carb":
            return 25.0, 500.0
        if category == "fruit":
            return 60.0, 350.0
        if category == "dairy":
            return 50.0, 400.0
        if category == "veg":
            return 80.0, 350.0
        if category == "drink":
            return 0.0, 700.0
        return 10.0, 500.0

    def raw_totals() -> dict[str, float]:
        totals = {key: 0.0 for key in nutrients}
        for entry in entries:
            grams = float(entry["item"].get(entry["grams_key"], 0) or 0)
            for key in nutrients:
                totals[key] += grams * entry["per_gram"][key]
        return totals

    def compliant() -> bool:
        totals = raw_totals()
        return all(
            totals[key] > 0 and abs(totals[key] - targets[key]) / targets[key] <= tolerances[key]
            for key in nutrients
        )

    for _ in range(max(1, max_passes)):
        if compliant():
            break
        changed = False
        for entry in entries:
            totals = raw_totals()
            minimum, maximum = bounds(entry)
            current = max(minimum, min(maximum, float(entry["item"].get(entry["grams_key"], 0) or minimum)))
            numerator = 0.0
            denominator = 0.0
            for key in nutrients:
                normalized_error = (totals[key] - targets[key]) / targets[key]
                normalized_contribution = entry["per_gram"][key] / targets[key]
                numerator += weights[key] * normalized_contribution * normalized_error
                denominator += weights[key] * normalized_contribution * normalized_contribution

            regularization = 0.004 if entry["category"] == "veg" else 0.00035
            reference = max(25.0, float(entry["original"] or current))
            numerator += regularization * ((current - entry["original"]) / (reference * reference))
            denominator += regularization / (reference * reference)
            if denominator <= 0:
                continue

            delta = max(-80.0, min(80.0, -numerator / denominator))
            next_grams = round(max(minimum, min(maximum, current + delta)), 1)
            if abs(next_grams - current) >= 0.1:
                entry["item"][entry["grams_key"]] = next_grams
                changed = True
        if not changed:
            break

    # Low-intensity calorie finishing pass, using carb/fat foods only.
    calorie_candidates = [
        entry for entry in entries
        if entry["per_gram"]["calories"] > 0 and entry["category"] in {"carb", "fruit", "fat"}
    ]
    for index in range(8):
        totals = raw_totals()
        calorie_delta = targets["calories"] - totals["calories"]
        if abs(calorie_delta) / targets["calories"] <= 0.01 or not calorie_candidates:
            break
        entry = calorie_candidates[index % len(calorie_candidates)]
        minimum, maximum = bounds(entry)
        current = float(entry["item"].get(entry["grams_key"], 0) or minimum)
        grams_delta = calorie_delta / entry["per_gram"]["calories"]
        entry["item"][entry["grams_key"]] = round(
            max(minimum, min(maximum, current + max(-35.0, min(35.0, grams_delta)))),
            1,
        )

    serialized = json.dumps(meals, ensure_ascii=False, separators=(",", ":"))
    totals = calculate_meals_totals(serialized)
    changed_items = sum(
        1
        for entry in entries
        if abs(float(entry["item"].get(entry["grams_key"], 0) or 0) - float(entry["original"])) >= 0.1
    )
    return serialized, totals, changed_items
