from app.core.nutrition_engine import calculate_nutrition_targets


def test_high_activity_cut_surfaces_energy_availability_warning():
    result = calculate_nutrition_targets(
        weight_kg=62,
        height_cm=165,
        age=28,
        gender="F",
        goal="pérdida de grasa",
        activity_level="athlete",
        body_fat_percent=22,
    )

    joined = " ".join(result.warnings).lower()
    assert "disponibilidad energética" in joined


def test_calorie_floor_is_described_as_guardrail_not_safety_guarantee():
    result = calculate_nutrition_targets(
        weight_kg=45,
        height_cm=150,
        age=30,
        gender="F",
        goal="pérdida de grasa",
        activity_level="sedentary",
        body_fat_percent=30,
    )

    if result.target_calories == 1200:
        joined = " ".join(result.warnings).lower()
        assert "guardrail" in joined
        assert "no garantiza" in joined
