from __future__ import annotations

import re
from pathlib import Path


def _load_frontend_food_database() -> list[dict]:
    """Carga la base grande de alimentos desde src/data/foodDatabase.ts.

    Mantiene una sola fuente de verdad durante el MVP. En Render el repo completo
    debe desplegarse para que backend pueda leer ../src/data/foodDatabase.ts.
    """
    candidates = [
        Path(__file__).resolve().parents[1] / "src" / "data" / "foodDatabase.ts",
        Path(__file__).resolve().parent.parent / "src" / "data" / "foodDatabase.ts",
    ]
    source = next((path for path in candidates if path.exists()), None)
    if not source:
        return []

    text = source.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{\s*name:\s*'(?P<name>.*?)',\s*"
        r"proteinPer100g:\s*(?P<protein>[0-9.]+),\s*"
        r"carbsPer100g:\s*(?P<carbs>[0-9.]+),\s*"
        r"fatPer100g:\s*(?P<fat>[0-9.]+),\s*"
        r"calsPer100g:\s*(?P<cals>[0-9.]+),\s*"
        r"fiberPer100g:\s*(?P<fiber>[0-9.]+),\s*"
        r"category:\s*'(?P<category>.*?)',\s*"
        r"clientNote:\s*'(?P<client>.*?)',\s*"
        r"trainerNote:\s*'(?P<trainer>.*?)'",
        re.DOTALL,
    )
    foods: list[dict] = []
    for match in pattern.finditer(text):
        foods.append({
            "name": match.group("name"),
            "category": match.group("category"),
            "protein_per_100g": float(match.group("protein")),
            "carbs_per_100g": float(match.group("carbs")),
            "fat_per_100g": float(match.group("fat")),
            "cals_per_100g": float(match.group("cals")),
            "fiber_per_100g": float(match.group("fiber")),
            "client_note": match.group("client"),
            "trainer_note": match.group("trainer"),
        })
    return foods

FALLBACK_FOOD_DATABASE = [
    {
        "name": "Pechuga de pollo a la plancha",
        "category": "protein",
        "protein_per_100g": 31,
        "carbs_per_100g": 0,
        "fat_per_100g": 3.6,
        "cals_per_100g": 165,
        "fiber_per_100g": 0,
        "client_note": "Proteína magra base para perder grasa sin sacrificar músculo.",
        "trainer_note": "Primera opción en déficit y recomposición.",
    },
    {
        "name": "Papa cocida",
        "category": "carb",
        "protein_per_100g": 1.7,
        "carbs_per_100g": 17,
        "fat_per_100g": 0.1,
        "cals_per_100g": 77,
        "fiber_per_100g": 1.3,
        "client_note": "Opción saciante y fácil de digerir. Muy útil para reemplazar plátano.",
        "trainer_note": "Excelente en déficit calórico por volumen y menor densidad calórica.",
    },
    {
        "name": "Plátano maduro asado",
        "category": "carb",
        "protein_per_100g": 1.3,
        "carbs_per_100g": 32,
        "fat_per_100g": 0.4,
        "cals_per_100g": 122,
        "fiber_per_100g": 2.3,
        "client_note": "Buena fuente de energía antes de entrenar, pero debe medirse.",
        "trainer_note": "Ideal pre-entreno. Evitar grandes porciones en pérdida de grasa nocturna.",
    },
    {
        "name": "Arroz integral cocido",
        "category": "carb",
        "protein_per_100g": 2.6,
        "carbs_per_100g": 23,
        "fat_per_100g": 0.9,
        "cals_per_100g": 112,
        "fiber_per_100g": 1.8,
        "client_note": "Energía estable para almuerzos y días de pierna.",
        "trainer_note": "Controlar porción si el cliente tiene baja actividad.",
    },
    {
        "name": "Claras de huevo",
        "category": "protein",
        "protein_per_100g": 11,
        "carbs_per_100g": 0.7,
        "fat_per_100g": 0.2,
        "cals_per_100g": 52,
        "fiber_per_100g": 0,
        "client_note": "Proteína casi pura, muy fácil de ajustar.",
        "trainer_note": "Herramienta clave para subir proteína sin subir calorías.",
    },
]

FOOD_DATABASE = _load_frontend_food_database() or FALLBACK_FOOD_DATABASE

ROUTINE_TEMPLATES = [
    {
        "title": "Corte Imperial: Pérdida de Grasa",
        "target_goal": "Pérdida de Grasa",
        "level": "Intermedio",
        "days_per_week": 5,
        "description": "Fuerza compuesta, circuitos metabólicos y cardio progresivo.",
        "trainer_rationale": "Mantiene masa muscular mientras eleva gasto calórico semanal.",
        "days": [
            {
                "day": "Día 1: Tren Inferior",
                "focus": "Pierna completa y gasto calórico",
                "warmup": "10 min bicicleta + movilidad de cadera",
                "exercises": [
                    {"name": "Sentadilla Goblet", "sets": 4, "reps": "12-15", "rest": "60s", "notes": "Técnica limpia"},
                    {"name": "Prensa 45", "sets": 4, "reps": "15", "rest": "60s", "notes": "No bloquear rodillas"},
                    {"name": "Peso Muerto Rumano", "sets": 4, "reps": "12", "rest": "75s", "notes": "Bajada controlada"},
                ],
                "cooldown": "Estiramiento de piernas 5 min",
            }
        ],
    }
]