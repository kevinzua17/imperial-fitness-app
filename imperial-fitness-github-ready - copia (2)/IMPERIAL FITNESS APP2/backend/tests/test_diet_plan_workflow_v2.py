import json

import pytest
from pydantic import ValidationError

from app.schemas import DietPlanCreate, DietPlanOut, DietPlanUpdate


def meals_for(total_calories: int, *, protein_scale: float = 1.0) -> str:
    ratio = total_calories / 2000
    per_meal = {
        "calories": total_calories / 3,
        "protein": (150 * ratio * protein_scale) / 3,
        "carbs": (220 * ratio) / 3,
        "fat": (58 * ratio) / 3,
    }
    return json.dumps([
        {"name": name, "items": [{
            "amountGrams": 100,
            "baseCalsPer100g": per_meal["calories"],
            "baseProteinPer100g": per_meal["protein"],
            "baseCarbsPer100g": per_meal["carbs"],
            "baseFatPer100g": per_meal["fat"],
        }]}
        for name in ("Desayuno", "Almuerzo", "Cena")
    ])


def base_payload(**overrides):
    payload = {
        "client_id": 10,
        "title": "Plan nutricional v2",
        "calories": 2000,
        "protein": 150,
        "carbs": 220,
        "fat": 58,
        "meals_json": meals_for(1800),
        "status": "draft",
        "active": 0,
        "calculation_json": "{}",
    }
    payload.update(overrides)
    return payload


def test_draft_can_be_edited_inside_twenty_percent_tolerance():
    plan = DietPlanCreate(**base_payload())
    assert plan.status == "draft"
    update = DietPlanUpdate(calories=2000, meals_json=meals_for(1700))
    assert update.calories == 2000


def test_published_plan_requires_full_day_within_five_percent():
    with pytest.raises(ValidationError, match="se desvían"):
        DietPlanCreate(**base_payload(status="published", active=1, meals_json=meals_for(1800)))

    plan = DietPlanCreate(**base_payload(status="published", active=1, meals_json=meals_for(1950)))
    assert plan.status == "published"


def test_published_plan_cannot_be_inactive():
    with pytest.raises(ValidationError, match="debe quedar activo"):
        DietPlanCreate(**base_payload(status="published", active=0, meals_json=meals_for(2000)))


def test_published_plan_rejects_macros_that_do_not_match_foods():
    with pytest.raises(ValidationError, match="proteína"):
        DietPlanCreate(**base_payload(status="published", active=1, meals_json=meals_for(2000, protein_scale=0.5)))


def test_empty_draft_can_be_created_before_meals_are_added():
    plan = DietPlanCreate(**base_payload(meals_json="[]", status="draft", active=0))
    assert plan.meals_json == "[]"


def test_legacy_published_plan_remains_readable_even_if_it_needs_recalculation():
    legacy = DietPlanOut.model_validate({
        "id": 99,
        "client_id": 10,
        "title": "Plan histórico",
        "calories": 2000,
        "protein": 150,
        "carbs": 220,
        "fat": 58,
        "meals_json": meals_for(1200, protein_scale=0.4),
        "notes": "Conservar lectura; reemplazar mediante borrador.",
        "active": 1,
        "status": "published",
        "version": 1,
        "calculation_json": "{}",
        "created_at": "2026-01-01T00:00:00",
    })
    assert legacy.id == 99
    assert legacy.status == "published"
