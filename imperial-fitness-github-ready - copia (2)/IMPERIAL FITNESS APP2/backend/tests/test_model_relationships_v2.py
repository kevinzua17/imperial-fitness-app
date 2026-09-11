from sqlalchemy.orm import configure_mappers


def test_diet_plan_user_relationships_are_unambiguous():
    """Adding approved_by must not break User.diets / DietPlan.client mapping."""
    from app import models  # noqa: F401

    configure_mappers()
    assert models.User.diets.property.local_remote_pairs
    assert models.DietPlan.client.property.local_remote_pairs
