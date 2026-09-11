import json

from app.models import AssignedRoutine, DietPlan, User
from app.services.plan_pdf import build_plan_pdf


def test_plan_pdf_contains_published_training_and_nutrition():
    client = User(id=901, name="Cliente PDF", email="pdf@example.com", role="client", password_hash="x", goal="Hipertrofia")
    coach = User(id=902, name="Coach PDF", email="coach-pdf@example.com", role="trainer", password_hash="x")
    routine = AssignedRoutine(
        id=1,
        client_id=client.id,
        trainer_id=coach.id,
        title="Rutina publicada",
        objective="Hipertrofia",
        active=1,
        payload_json=json.dumps({
            "days": [{
                "day": "Lunes",
                "focus": "Pecho",
                "exercises": [{
                    "name": "Press banca",
                    "sets": 4,
                    "reps": "8-12",
                    "rest": "90 s",
                    "targetRir": "2",
                    "imageUrl": "/exercises/pecho/pecho-press-banca.jpeg",
                }],
            }],
        }),
    )
    diet = DietPlan(
        id=1,
        client_id=client.id,
        title="Nutrición publicada",
        calories=2400,
        protein=180,
        carbs=260,
        fat=70,
        active=1,
        status="published",
        version=2,
        meals_json=json.dumps([{"name": "Desayuno", "items": [{"currentName": "Avena", "amountGrams": 80}]}]),
        notes="Revisar adherencia semanal.",
    )

    raw = build_plan_pdf(client=client, coach=coach, routine=routine, diet=diet)

    assert raw.startswith(b"%PDF")
    assert len(raw) > 5_000
