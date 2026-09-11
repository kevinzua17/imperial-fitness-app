import pytest

from app.core.nutrition_engine import NutritionInputError, calculate_nutrition_targets


BASE = {
    "weight_kg": 80,
    "height_cm": 178,
    "age": 32,
    "gender": "M",
    "goal": "Pérdida de grasa",
    "activity_level": "moderate",
    "body_fat_percent": 22,
}


def test_inbody_bmr_has_priority_when_source_is_confirmed():
    target = calculate_nutrition_targets(**BASE, inbody_bmr=1810, bmr_source="inbody")
    assert target.bmr == 1810
    assert target.bmr_source == "inbody"
    assert target.maintenance_calories == round(1810 * 1.55)
    assert target.target_calories < target.maintenance_calories


def test_mifflin_is_used_when_inbody_is_not_available():
    target = calculate_nutrition_targets(**BASE)
    expected = round((10 * 80) + (6.25 * 178) - (5 * 32) + 5)
    assert target.bmr == expected
    assert target.bmr_source == "mifflin_st_jeor"


def test_recorded_bmr_without_source_is_not_mislabeled_as_inbody():
    target = calculate_nutrition_targets(**BASE, inbody_bmr=1750)
    assert target.bmr == 1750
    assert target.bmr_source == "recorded_bmr"
    assert target.warnings


@pytest.mark.parametrize("field,value", [
    ("weight_kg", None),
    ("height_cm", 0),
    ("age", None),
    ("gender", ""),
    ("goal", ""),
])
def test_missing_required_data_never_uses_hidden_defaults(field, value):
    payload = dict(BASE)
    payload[field] = value
    with pytest.raises(NutritionInputError):
        calculate_nutrition_targets(**payload)


def test_missing_activity_is_rejected_when_no_recorded_activity_answers_exist():
    payload = dict(BASE)
    payload["activity_level"] = None
    with pytest.raises(NutritionInputError, match="actividad"):
        calculate_nutrition_targets(**payload)


def test_activity_can_be_derived_from_recorded_answers_without_hidden_default():
    payload = dict(BASE)
    payload["activity_level"] = None
    target = calculate_nutrition_targets(
        **payload,
        workouts_per_week=4,
        average_daily_steps=8500,
        occupation_activity="ligero",
    )
    assert target.activity_level == "moderate"


def test_minors_are_blocked_from_automatic_deficit_or_surplus():
    payload = dict(BASE)
    payload["age"] = 17
    with pytest.raises(NutritionInputError, match="menores de 18"):
        calculate_nutrition_targets(**payload)


def test_macro_calories_remain_close_to_target():
    target = calculate_nutrition_targets(**BASE)
    macro_calories = target.protein_grams * 4 + target.carbs_grams * 4 + target.fat_grams * 9
    assert abs(macro_calories - target.target_calories) <= 25
