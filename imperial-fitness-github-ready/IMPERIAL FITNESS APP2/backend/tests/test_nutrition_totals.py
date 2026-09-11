import json

import pytest

from app.core.nutrition import calculate_meals_totals, validate_meals_calorie_alignment, validate_meals_nutrition_alignment


def test_calculates_meal_totals_from_real_grams():
    meals = [{"name": "Almuerzo", "items": [
        {"amountGrams": 150, "baseProteinPer100g": 31, "baseCarbsPer100g": 0, "baseFatPer100g": 3.6, "baseCalsPer100g": 165},
        {"amountGrams": 200, "baseProteinPer100g": 2.7, "baseCarbsPer100g": 28, "baseFatPer100g": 0.3, "baseCalsPer100g": 130},
    ]}]
    totals = calculate_meals_totals(json.dumps(meals))
    assert totals["calories"] == 508
    assert totals["protein"] >= 50


def test_rejects_plan_far_from_target_calories():
    meals = [
        {"name": "Desayuno", "items": [{"amountGrams": 100, "baseCalsPer100g": 100}]},
        {"name": "Almuerzo", "items": [{"amountGrams": 100, "baseCalsPer100g": 100}]},
        {"name": "Cena", "items": [{"amountGrams": 100, "baseCalsPer100g": 100}]},
    ]
    with pytest.raises(ValueError, match="se desvían"):
        validate_meals_calorie_alignment(json.dumps(meals), 2000)


def test_accepts_plan_close_to_target_calories():
    meals = [
        {"name": "Desayuno", "items": [{"amountGrams": 400, "baseCalsPer100g": 190}]},
        {"name": "Almuerzo", "items": [{"amountGrams": 300, "baseCalsPer100g": 190}]},
        {"name": "Cena", "items": [{"amountGrams": 300, "baseCalsPer100g": 190}]},
    ]
    assert validate_meals_calorie_alignment(json.dumps(meals), 2000)["calories"] == 1900


def test_rejects_plan_with_correct_calories_but_wrong_protein():
    meals = [
        {"name": name, "items": [{
            "amountGrams": 100,
            "baseCalsPer100g": 650,
            "baseProteinPer100g": 15,
            "baseCarbsPer100g": 120,
            "baseFatPer100g": 12,
        }]}
        for name in ("Desayuno", "Almuerzo", "Cena")
    ]
    with pytest.raises(ValueError, match="proteína"):
        validate_meals_nutrition_alignment(
            json.dumps(meals),
            target_calories=1950,
            target_protein=150,
            target_carbs=360,
            target_fat=36,
            require_full_day=True,
        )
