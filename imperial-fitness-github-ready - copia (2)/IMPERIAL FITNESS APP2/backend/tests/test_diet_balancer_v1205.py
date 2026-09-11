import json

from app.core.nutrition import (
    calculate_meals_totals,
    rebalance_meals_to_targets,
    validate_meals_nutrition_alignment,
)


def sample_unbalanced_meals() -> str:
    meals = [
        {
            "name": "Desayuno",
            "items": [
                {"amountGrams": 250, "baseCalsPer100g": 52, "baseProteinPer100g": 11, "baseCarbsPer100g": 1, "baseFatPer100g": 0.2, "category": "protein"},
                {"amountGrams": 70, "baseCalsPer100g": 389, "baseProteinPer100g": 13, "baseCarbsPer100g": 66, "baseFatPer100g": 7, "category": "carb"},
                {"amountGrams": 120, "baseCalsPer100g": 89, "baseProteinPer100g": 1, "baseCarbsPer100g": 23, "baseFatPer100g": 0.3, "category": "carb"},
            ],
        },
        {
            "name": "Almuerzo",
            "items": [
                {"amountGrams": 180, "baseCalsPer100g": 165, "baseProteinPer100g": 31, "baseCarbsPer100g": 0, "baseFatPer100g": 3.6, "category": "protein"},
                {"amountGrams": 250, "baseCalsPer100g": 130, "baseProteinPer100g": 2.7, "baseCarbsPer100g": 28, "baseFatPer100g": 0.3, "category": "carb"},
                {"amountGrams": 150, "baseCalsPer100g": 35, "baseProteinPer100g": 2.4, "baseCarbsPer100g": 4, "baseFatPer100g": 0.4, "category": "veg"},
                {"amountGrams": 80, "baseCalsPer100g": 160, "baseProteinPer100g": 2, "baseCarbsPer100g": 8, "baseFatPer100g": 15, "category": "fat"},
            ],
        },
        {
            "name": "Snack",
            "items": [
                {"amountGrams": 250, "baseCalsPer100g": 59, "baseProteinPer100g": 10, "baseCarbsPer100g": 4, "baseFatPer100g": 0.4, "category": "protein"},
                {"amountGrams": 100, "baseCalsPer100g": 247, "baseProteinPer100g": 13, "baseCarbsPer100g": 43, "baseFatPer100g": 3.4, "category": "carb"},
            ],
        },
        {
            "name": "Cena",
            "items": [
                {"amountGrams": 200, "baseCalsPer100g": 128, "baseProteinPer100g": 26, "baseCarbsPer100g": 0, "baseFatPer100g": 2.3, "category": "protein"},
                {"amountGrams": 250, "baseCalsPer100g": 77, "baseProteinPer100g": 1.7, "baseCarbsPer100g": 17, "baseFatPer100g": 0.1, "category": "carb"},
                {"amountGrams": 170, "baseCalsPer100g": 35, "baseProteinPer100g": 2.4, "baseCarbsPer100g": 4, "baseFatPer100g": 0.4, "category": "veg"},
                {"amountGrams": 15, "baseCalsPer100g": 884, "baseProteinPer100g": 0, "baseCarbsPer100g": 0, "baseFatPer100g": 100, "category": "fat"},
            ],
        },
    ]
    return json.dumps(meals)


def test_rebalances_four_targets_without_changing_foods():
    source = sample_unbalanced_meals()
    before = json.loads(source)
    before_names = [[item.get("currentName") or item.get("originalName") for item in meal["items"]] for meal in before]

    balanced_json, totals, changed_items = rebalance_meals_to_targets(
        source,
        target_calories=2000,
        target_protein=150,
        target_carbs=220,
        target_fat=58,
    )

    assert changed_items > 0
    assert validate_meals_nutrition_alignment(
        balanced_json,
        target_calories=2000,
        target_protein=150,
        target_carbs=220,
        target_fat=58,
        require_full_day=True,
    ) == totals

    after = json.loads(balanced_json)
    after_names = [[item.get("currentName") or item.get("originalName") for item in meal["items"]] for meal in after]
    assert after_names == before_names
    assert len(after) == len(before)


def test_balancer_keeps_portions_inside_safe_bounds():
    balanced_json, _, _ = rebalance_meals_to_targets(
        sample_unbalanced_meals(),
        target_calories=2000,
        target_protein=150,
        target_carbs=220,
        target_fat=58,
    )
    meals = json.loads(balanced_json)
    for meal in meals:
        for item in meal["items"]:
            grams = item["amountGrams"]
            assert 0 <= grams <= 700


def test_original_plan_is_truly_unbalanced():
    totals = calculate_meals_totals(sample_unbalanced_meals())
    assert totals["calories"] > 2200
    assert totals["protein"] > 190
