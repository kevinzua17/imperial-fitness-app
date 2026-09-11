import json
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.cache import cache
from app.core.nutrition import rebalance_meals_to_targets, validate_meals_calorie_alignment, validate_meals_nutrition_alignment
from app.core.nutrition_engine import NutritionInputError, calculate_nutrition_targets
from app.deps import get_current_user, require_admin_or_trainer
from app.models import BodyMetric, DietPlan, Food, SyncEvent, User
from app.schemas import DietPlanCreate, DietPlanMealsUpdate, DietPlanOut, DietPlanUpdate, EquivalenceRequest, EquivalenceResponse, FoodCreate, FoodOut, FoodUpdate, NutritionTargetOut, NutritionTargetPreviewRequest, ScienceGuidelinesOut
from app.core.sanitize import sanitize_text
from app.core.time import utcnow


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


def _normalize_food_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in normalized if not unicodedata.combining(char)).lower()


def _nutrition_safety_fields(client: User) -> dict[str, str]:
    return {
        "allergies": (client.food_allergies or "").strip(),
        "intolerances": (client.food_intolerances or "").strip(),
        "excluded_foods": (client.excluded_foods or "").strip(),
        "medical_conditions": (client.medical_conditions or "").strip(),
        "medications": (client.medications or "").strip(),
    }


def _nutrition_review_required(client: User) -> bool:
    fields = _nutrition_safety_fields(client)
    return any(fields.values()) or bool(client.eating_pattern and client.eating_pattern != "omnivore")


def _split_terms(value: str) -> list[str]:
    return [term.strip() for term in re.split(r"[,;\n]+", value or "") if len(term.strip()) >= 2]


def _diet_safety_conflicts(client: User, meals_json: str) -> list[str]:
    normalized_meals = _normalize_food_text(meals_json)
    conflicts: list[str] = []
    direct_terms = []
    direct_terms.extend(_split_terms(client.food_allergies or ""))
    direct_terms.extend(_split_terms(client.food_intolerances or ""))
    direct_terms.extend(_split_terms(client.excluded_foods or ""))
    allergen_aliases = {
        "lactosa": ["leche", "queso", "yogur", "yogurt", "whey", "suero de leche"],
        "leche": ["leche", "queso", "yogur", "yogurt", "whey", "suero de leche"],
        "marisco": ["camaron", "langostino", "cangrejo", "langosta", "marisco"],
        "crustace": ["camaron", "langostino", "cangrejo", "langosta"],
        "pescado": ["atun", "salmon", "pescado", "tilapia", "merluza"],
        "gluten": ["trigo", "pan", "pasta", "harina", "cebada", "centeno"],
        "trigo": ["trigo", "pan", "pasta", "harina"],
        "mani": ["mani", "cacahuate", "peanut"],
        "cacahuate": ["mani", "cacahuate", "peanut"],
        "frutos secos": ["almendra", "nuez", "pistacho", "avellana", "anacardo", "castana"],
        "nuez": ["nuez", "almendra", "pistacho", "avellana", "anacardo"],
        "soja": ["soja", "soya", "tofu", "tempeh"],
        "soya": ["soja", "soya", "tofu", "tempeh"],
        "huevo": ["huevo", "clara", "yema"],
    }
    for term in direct_terms:
        normalized_term = _normalize_food_text(term)
        if normalized_term in normalized_meals:
            conflicts.append(term)
            continue
        for key, aliases in allergen_aliases.items():
            if key in normalized_term and any(alias in normalized_meals for alias in aliases):
                conflicts.append(term)
                break

    pattern = (client.eating_pattern or "").lower()
    forbidden_by_pattern = {
        "vegan": ["pollo", "pavo", "res", "carne", "cerdo", "atun", "salmon", "pescado", "camaron", "huevo", "leche", "queso", "yogur", "yogurt", "whey"],
        "vegetarian": ["pollo", "pavo", "res", "carne", "cerdo", "atun", "salmon", "pescado", "camaron"],
        "pescatarian": ["pollo", "pavo", "res", "carne", "cerdo"],
    }
    for term in forbidden_by_pattern.get(pattern, []):
        if term in normalized_meals:
            conflicts.append(f"{term} (incompatible con patrón {pattern})")

    return list(dict.fromkeys(conflicts))[:8]


def _assert_nutrition_safety_review(client: User, meals_json: str) -> None:
    if _nutrition_review_required(client) and not client.nutrition_reviewed_at:
        raise HTTPException(
            status_code=409,
            detail=(
                "El cliente tiene alergias, intolerancias, exclusiones, patrón alimentario o antecedentes relevantes. "
                "El profesional responsable debe revisar y aprobar la ficha de seguridad antes de publicar."
            ),
        )
    conflicts = _diet_safety_conflicts(client, meals_json)
    if conflicts:
        raise HTTPException(
            status_code=422,
            detail="El menú contiene elementos incompatibles con la ficha alimentaria: " + ", ".join(conflicts),
        )


SCIENCE_GUIDELINES = {
    "nutrition": {
        "protein_g_per_kg": {"default": [1.6, 2.2], "cutting_or_strength": [1.8, 2.4]},
        "fat_percent_calories": [20, 35],
        "carbs": "El resto de calorías después de proteína y grasa; se ajusta según objetivo, adherencia y volumen de entrenamiento.",
        "calorie_adjustment": {"fat_loss": "Déficit moderado 10-20%", "muscle_gain": "Superávit prudente 5-15%"},
        "hydration_ml_per_kg": [30, 45],
    },
    "training": {
        "frequency_by_level": {"Principiante": "2-3 días/semana", "Intermedio": "3-4 días/semana", "Avanzado": "4-5 días/semana"},
        "hypertrophy": "Volumen moderado-alto, 6-15 repeticiones, progresión semanal controlada y técnica prioritaria.",
        "strength": "Cargas más altas, descansos mayores y progresión gradual si el cliente domina la técnica.",
        "progression": "Aumentar carga, repeticiones o series solo cuando se cumple el rango objetivo con buena técnica y RIR seguro.",
    },
    "safety_notice": "Estas reglas son una base de apoyo para entrenadores. No sustituyen valoración médica, nutricional o fisioterapéutica individual."
}


def _require_coach_tool_access(current_user: User):
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Herramienta disponible solo para administrador o entrenador")


@router.get("/science-guidelines", response_model=ScienceGuidelinesOut)
def get_science_guidelines(current_user: User = Depends(get_current_user)):
    return SCIENCE_GUIDELINES


def _latest_metric(db: Session, user_id: int) -> BodyMetric | None:
    return (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id)
        .order_by(func.coalesce(BodyMetric.measured_at, BodyMetric.created_at).desc(), BodyMetric.id.desc())
        .first()
    )


def _validate_calculation_metadata(calculation_json: str, calories: int) -> dict:
    try:
        metadata = json.loads(calculation_json or "{}")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="El plan no contiene una auditoría nutricional válida.") from exc
    if not isinstance(metadata, dict):
        raise HTTPException(status_code=422, detail="La auditoría nutricional debe ser un objeto JSON.")
    required = {"formula_version", "bmr_source", "activity_level", "target_calories", "calculated_at"}
    missing = sorted(field for field in required if not metadata.get(field))
    if missing:
        raise HTTPException(
            status_code=422,
            detail="Falta trazabilidad del cálculo nutricional: " + ", ".join(missing),
        )
    if not str(metadata.get("formula_version", "")).startswith("imperial-nutrition-v2"):
        raise HTTPException(status_code=422, detail="El plan debe recalcularse con el motor nutricional v2 antes de publicarse.")
    try:
        calculated_target = int(metadata["target_calories"])
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="target_calories de la auditoría nutricional es inválido.") from exc
    deviation = abs(calculated_target - calories) / max(calculated_target, 1)
    if deviation > 0.05:
        raise HTTPException(
            status_code=422,
            detail=f"Las calorías del plan ({calories}) difieren más de 5% del cálculo auditado ({calculated_target}).",
        )
    return metadata


def _validate_based_on_metric(db: Session, client_id: int, metric_id: int | None) -> None:
    if metric_id is None:
        return
    metric = db.get(BodyMetric, metric_id)
    if not metric or metric.user_id != client_id:
        raise HTTPException(status_code=422, detail="La medición corporal seleccionada no pertenece al cliente.")


def _assert_target_access(db: Session, current_user: User, client_id: int) -> User:
    client = db.get(User, client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "client" and current_user.id != client_id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes calcular objetivos para clientes asignados")
    return client


@router.post("/targets/preview", response_model=NutritionTargetOut)
def preview_nutrition_targets(
    payload: NutritionTargetPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_id = payload.client_id or current_user.id
    client = _assert_target_access(db, current_user, client_id)
    metric = _latest_metric(db, client.id)
    try:
        targets = calculate_nutrition_targets(
            weight_kg=(metric.weight if metric else client.weight),
            height_cm=client.height,
            age=client.age,
            gender=client.gender,
            goal=payload.goal or client.goal,
            activity_level=client.activity_level,
            workouts_per_week=client.workouts_per_week,
            average_daily_steps=client.average_daily_steps,
            occupation_activity=client.occupation_activity,
            body_fat_percent=(metric.body_fat if metric else client.body_fat),
            inbody_bmr=(metric.bmr if metric else None),
            bmr_source=(metric.bmr_source if metric else None),
        ).to_dict()
    except NutritionInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    targets["based_on_metric_id"] = metric.id if metric else None
    if _nutrition_review_required(client):
        safety = _nutrition_safety_fields(client)
        if not client.nutrition_reviewed_at:
            targets["warnings"].append("Ficha alimentaria pendiente de revisión profesional antes de publicar un plan.")
        if safety["allergies"]:
            targets["warnings"].append("Alergias registradas: verifica ingredientes y contaminación cruzada.")
        if safety["intolerances"]:
            targets["warnings"].append("Intolerancias registradas: valida sustituciones antes de publicar.")
        if client.eating_pattern and client.eating_pattern != "omnivore":
            targets["warnings"].append(f"Patrón alimentario declarado: {client.eating_pattern}.")
    return targets


@router.post("/foods", response_model=FoodOut)
def create_food(
    payload: FoodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    _require_coach_tool_access(current_user)
    existing = db.query(Food).filter(Food.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un alimento con ese nombre")
    food = Food(**payload.model_dump())
    db.add(food)
    db.flush()
    db.add(SyncEvent(
        title="Alimento agregado",
        detail=f"{current_user.name} agregó {food.name} a la base de alimentos.",
        source="Base de alimentos",
        target="Nutrición",
        event_type="nutrition",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(food)
    cache.delete_prefix("foods:")
    cache.delete_prefix("sync:")
    return food


@router.put("/foods/{food_id}", response_model=FoodOut)
def update_food(
    food_id: int,
    payload: FoodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    _require_coach_tool_access(current_user)
    food = db.get(Food, food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Alimento no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(food, field, value)
    db.add(SyncEvent(
        title="Alimento actualizado",
        detail=f"{current_user.name} actualizó {food.name} en la base de alimentos.",
        source="Base de alimentos",
        target="Nutrición",
        event_type="nutrition",
        actor_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(food)
    cache.delete_prefix("foods:")
    cache.delete_prefix("sync:")
    return food


@router.get("/foods", response_model=list[FoodOut])
def list_foods(
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"foods:{category or 'all'}:{search or ''}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    query = db.query(Food).order_by(Food.name.asc())
    if category:
        query = query.filter(Food.category == sanitize_text(category, 40))
    if search:
        query = query.filter(Food.name.ilike(f"%{sanitize_text(search, 120)}%"))
    foods = query.all()
    result = [FoodOut.model_validate(food).model_dump() for food in foods]
    cache.set(cache_key, result)
    return result


@router.post("/equivalence", response_model=EquivalenceResponse)
def calculate_equivalence(
    payload: EquivalenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.get(Food, payload.original_food_id)
    substitute = db.get(Food, payload.substitute_food_id)
    if not original or not substitute:
        raise HTTPException(status_code=404, detail="Alimento no encontrado")

    def portion(food: Food, grams: float) -> dict[str, float]:
        factor = grams / 100.0
        return {
            "calories": round(food.cals_per_100g * factor, 2),
            "protein": round(food.protein_per_100g * factor, 2),
            "carbs": round(food.carbs_per_100g * factor, 2),
            "fat": round(food.fat_per_100g * factor, 2),
        }

    compatible_categories = {
        "protein": {"protein", "dairy"},
        "dairy": {"protein", "dairy"},
        "carb": {"carb", "fruit"},
        "fruit": {"carb", "fruit"},
        "fat": {"fat", "snack"},
        "snack": {"fat", "snack"},
        "veg": {"veg"},
        "drink": {"drink"},
    }
    allowed = compatible_categories.get(original.category, {original.category})
    if substitute.category not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Sustitución incompatible: {original.category} no debe cambiarse directamente por {substitute.category}.",
        )

    target = portion(original, payload.original_grams)
    per_gram = {
        "calories": substitute.cals_per_100g / 100.0,
        "protein": substitute.protein_per_100g / 100.0,
        "carbs": substitute.carbs_per_100g / 100.0,
        "fat": substitute.fat_per_100g / 100.0,
    }

    # En intercambio de un solo alimento, preservamos exactamente el nutriente
    # principal del grupo y luego mostramos el impacto real en los demás macros.
    category_focus = {
        "protein": "protein", "dairy": "protein",
        "carb": "carbs", "fruit": "carbs",
        "fat": "fat",
    }.get(original.category, "calories")
    focus_target = target[category_focus]
    focus_per_gram = per_gram[category_focus]

    basis_nutrient = category_focus
    if focus_target > 0 and focus_per_gram > 0:
        substitute_grams = focus_target / focus_per_gram
    elif target["calories"] > 0 and per_gram["calories"] > 0:
        basis_nutrient = "calories"
        substitute_grams = target["calories"] / per_gram["calories"]
    else:
        raise HTTPException(status_code=422, detail="No es posible calcular una equivalencia nutricional con estos alimentos")

    unconstrained_grams = substitute_grams
    calorie_cap_applied = False
    if payload.max_substitute_calories is not None and per_gram["calories"] > 0:
        max_grams_by_calories = payload.max_substitute_calories / per_gram["calories"]
        if substitute_grams > max_grams_by_calories:
            substitute_grams = max(0.0, max_grams_by_calories)
            calorie_cap_applied = True

    substitute_grams = min(1500.0, substitute_grams)
    if substitute_grams > 0:
        substitute_grams = max(1.0, substitute_grams)
    result = portion(substitute, substitute_grams)
    deltas = {key: round(result[key] - target[key], 2) for key in target}

    weights = {"calories": 3.0, "protein": 1.0, "carbs": 1.0, "fat": 1.0}
    weights[basis_nutrient] = 6.0
    weighted_error = 0.0
    weight_total = 0.0
    for nutrient, target_value in target.items():
        # Evita que trazas nutricionales (p. ej. 0.1 g de grasa) dominen la puntuación.
        if target_value <= 0 or (nutrient != "calories" and target_value < 1.0):
            continue
        weight = weights[nutrient]
        weighted_error += weight * abs(deltas[nutrient]) / target_value
        weight_total += weight
    mean_error = weighted_error / weight_total if weight_total else 1.0
    accuracy = round(max(0.0, min(100.0, (1.0 - mean_error) * 100.0)), 1)

    tolerances = {"calories": 10.0, "protein": 1.5, "carbs": 2.0, "fat": 1.0}
    is_exact = all(abs(deltas[key]) <= tolerance for key, tolerance in tolerances.items())
    impractical_portion = substitute_grams < 5 or substitute_grams > 800
    compatibility = "alta" if accuracy >= 90 else "media" if accuracy >= 75 else "baja"
    if impractical_portion:
        compatibility = "baja"

    warning = None
    if not is_exact:
        warning = "Equivalencia por nutriente principal: revisa las diferencias de macros antes de confirmar."
    if compatibility == "baja":
        warning = "Sustitución no recomendada como alimento único: altera de forma importante los macros o exige una porción poco práctica."
    if calorie_cap_applied:
        warning = (
            f"La porción se redujo desde {round(unconstrained_grams, 1)} g para no superar "
            f"el máximo disponible de {round(payload.max_substitute_calories or 0, 1)} kcal."
        )

    return {
        "original_food": original.name,
        "substitute_food": substitute.name,
        "original_grams": payload.original_grams,
        "substitute_grams": round(substitute_grams, 1),
        "basis": f"igualación de {basis_nutrient}",
        "client_note": substitute.client_note,
        "trainer_note": substitute.trainer_note,
        "original_macros": target,
        "substitute_macros": result,
        "deltas": deltas,
        "accuracy_percent": accuracy,
        "compatibility": compatibility,
        "is_exact": is_exact,
        "calorie_cap_applied": calorie_cap_applied,
        "max_substitute_calories": round(payload.max_substitute_calories, 1) if payload.max_substitute_calories is not None else None,
        "warning": warning,
    }


@router.get("/diet-plans", response_model=list[DietPlanOut])
def list_diet_plans(
    response: Response,
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    query = db.query(DietPlan).filter(DietPlan.active == 1, DietPlan.status == "published").order_by(DietPlan.created_at.desc(), DietPlan.id.desc())
    if current_user.role == "client":
        query = query.filter(DietPlan.client_id == current_user.id)
    elif current_user.role == "trainer":
        assigned_ids = [u.id for u in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
        query = query.filter(DietPlan.client_id.in_(assigned_ids))
    if client_id:
        if current_user.role == "client" and client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Permiso insuficiente")
        query = query.filter(DietPlan.client_id == client_id)
    return query.all()


@router.get("/diet-plans/my-plan", response_model=DietPlanOut | None)
def get_my_diet_plan(response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    plan = db.query(DietPlan).filter(DietPlan.client_id == current_user.id, DietPlan.active == 1, DietPlan.status == "published").order_by(DietPlan.created_at.desc(), DietPlan.id.desc()).first()
    return plan


@router.put("/diet-plans/my-plan/meals", response_model=DietPlanOut)
def update_my_diet_plan_meals(
    payload: DietPlanMealsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Esta ruta está disponible para el cliente titular del plan")
    plan = db.query(DietPlan).filter(
        DietPlan.client_id == current_user.id,
        DietPlan.active == 1,
        DietPlan.status == "published",
    ).order_by(DietPlan.created_at.desc(), DietPlan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No tienes un plan nutricional activo")

    try:
        validate_meals_nutrition_alignment(
            payload.meals_json,
            target_calories=plan.calories,
            target_protein=plan.protein,
            target_carbs=plan.carbs,
            target_fat=plan.fat,
            require_full_day=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    # Un plan publicado es inmutable. Una sustitución solicitada por el cliente
    # se conserva como nueva variante/borrador para revisión del coach, en vez de
    # alterar silenciosamente la prescripción publicada.
    latest_version = db.query(func.max(DietPlan.version)).filter(
        DietPlan.client_id == current_user.id
    ).scalar() or plan.version or 1
    variant = DietPlan(
        client_id=plan.client_id,
        title=f"{plan.title} · Variante cliente",
        calories=plan.calories,
        protein=plan.protein,
        carbs=plan.carbs,
        fat=plan.fat,
        meals_json=payload.meals_json,
        notes=(plan.notes or "").rstrip() + "\nVariante solicitada por el cliente; requiere revisión profesional antes de publicarse.",
        active=0,
        status="draft",
        version=int(latest_version) + 1,
        calculation_json=plan.calculation_json,
        based_on_metric_id=plan.based_on_metric_id,
        approved_by=None,
        published_at=None,
        supersedes_plan_id=plan.id,
    )
    db.add(variant)
    db.flush()
    db.add(SyncEvent(
        title="Variante nutricional solicitada",
        detail=f"{current_user.name} propuso una sustitución. Se creó la versión {variant.version} en borrador para revisión del coach; el plan publicado no cambió.",
        source="App Cliente",
        target="Panel Coach",
        event_type="plan_variant",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
    ))
    db.commit()
    db.refresh(variant)
    cache.delete_prefix("stats:")
    cache.delete_prefix("sync:")
    return variant


@router.post("/diet-plans", response_model=DietPlanOut)
def create_diet_plan(
    payload: DietPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    client = db.query(User).filter(User.id == payload.client_id).with_for_update().one_or_none()
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes crear dietas para clientes asignados")
    _validate_based_on_metric(db, client.id, payload.based_on_metric_id)
    if payload.status == "published":
        _validate_calculation_metadata(payload.calculation_json, payload.calories)
        _assert_nutrition_safety_review(client, payload.meals_json)
        try:
            validate_meals_nutrition_alignment(
                payload.meals_json,
                target_calories=payload.calories,
                target_protein=payload.protein,
                target_carbs=payload.carbs,
                target_fat=payload.fat,
                require_full_day=True,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    latest_version = db.query(func.max(DietPlan.version)).filter(DietPlan.client_id == client.id).scalar() or 0
    plan_data = payload.model_dump()
    plan_data["version"] = max(int(plan_data.get("version") or 1), latest_version + 1)

    if payload.status == "draft":
        plan_data.update({"active": 0, "approved_by": None, "published_at": None})
        event_title = "Borrador nutricional creado"
        event_detail = f"{current_user.name} creó la versión {plan_data['version']} en borrador para {client.name}."
    else:
        current_active = (
            db.query(DietPlan)
            .filter(DietPlan.client_id == client.id, DietPlan.active == 1, DietPlan.status == "published")
            .with_for_update()
            .first()
        )
        if current_active:
            current_active.active = 0
            current_active.status = "archived"
            plan_data["supersedes_plan_id"] = current_active.id
        plan_data.update({"active": 1, "status": "published", "approved_by": current_user.id, "published_at": utcnow()})
        event_title = "Plan nutricional publicado"
        event_detail = f"{current_user.name} aprobó y publicó la versión {plan_data['version']} para {client.name}."

    plan = DietPlan(**plan_data)
    db.add(plan)
    db.flush()
    db.add(SyncEvent(
        title=event_title,
        detail=event_detail,
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    db.refresh(plan)
    cache.delete_prefix("stats:")
    cache.delete_prefix("sync:")
    return plan

def _can_manage_client(db: Session, client_id: int, current_user: User) -> User:
    client = db.get(User, client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes gestionar clientes asignados")
    if current_user.role not in {"admin", "trainer"}:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return client


def _get_manageable_plan(
    plan_id: int,
    db: Session,
    current_user: User,
    *,
    require_draft: bool = False,
) -> tuple[DietPlan, User]:
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id).with_for_update().one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan nutricional no encontrado")
    client = _can_manage_client(db, plan.client_id, current_user)
    if plan.status == "archived":
        raise HTTPException(status_code=409, detail="Este plan está archivado y no puede editarse.")
    if require_draft and plan.status != "draft":
        raise HTTPException(status_code=409, detail="Un plan publicado es inmutable. Crea una nueva versión en borrador.")
    return plan, client


@router.post("/clients/{client_id}/safety-review")
def approve_client_nutrition_safety(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    client = _assert_target_access(db, current_user, client_id)
    client.nutrition_reviewed_at = utcnow()
    client.nutrition_reviewed_by = current_user.id
    db.add(SyncEvent(
        title="Ficha nutricional revisada",
        detail=f"{current_user.name} confirmó la revisión de alergias, preferencias y antecedentes de {client.name}.",
        source="Panel Coach",
        target="Nutrición",
        event_type="nutrition_review",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    return {
        "ok": True,
        "client_id": client.id,
        "reviewed_at": client.nutrition_reviewed_at,
        "reviewed_by": current_user.id,
        "review_required": _nutrition_review_required(client),
    }


@router.get("/diet-plans/drafts", response_model=list[DietPlanOut])
def list_diet_drafts(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    _can_manage_client(db, client_id, current_user)
    return (
        db.query(DietPlan)
        .filter(DietPlan.client_id == client_id, DietPlan.status == "draft")
        .order_by(DietPlan.version.desc(), DietPlan.created_at.desc())
        .all()
    )


@router.post("/diet-plans/{plan_id}/publish", response_model=DietPlanOut)
def publish_diet_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    plan, client = _get_manageable_plan(plan_id, db, current_user, require_draft=True)
    db.query(User).filter(User.id == client.id).with_for_update().one()
    _validate_based_on_metric(db, client.id, plan.based_on_metric_id)
    _validate_calculation_metadata(plan.calculation_json, plan.calories)
    _assert_nutrition_safety_review(client, plan.meals_json)
    try:
        validate_meals_nutrition_alignment(
            plan.meals_json,
            target_calories=plan.calories,
            target_protein=plan.protein,
            target_carbs=plan.carbs,
            target_fat=plan.fat,
            require_full_day=True,
        )
    except ValueError as initial_exc:
        try:
            balanced_json, _balanced_totals, changed_items = rebalance_meals_to_targets(
                plan.meals_json,
                target_calories=plan.calories,
                target_protein=plan.protein,
                target_carbs=plan.carbs,
                target_fat=plan.fat,
            )
            validate_meals_nutrition_alignment(
                balanced_json,
                target_calories=plan.calories,
                target_protein=plan.protein,
                target_carbs=plan.carbs,
                target_fat=plan.fat,
                require_full_day=True,
            )
            plan.meals_json = balanced_json
            if changed_items > 0:
                plan.notes = (plan.notes or '').rstrip() + f"\nAjuste automático final de porciones: {changed_items} alimentos equilibrados antes de publicar."
        except ValueError as balance_exc:
            raise HTTPException(
                status_code=422,
                detail=f"El menú no pudo equilibrarse automáticamente. {balance_exc}",
            ) from initial_exc
    current_active = (
        db.query(DietPlan)
        .filter(
            DietPlan.client_id == client.id,
            DietPlan.active == 1,
            DietPlan.status == "published",
            DietPlan.id != plan.id,
        )
        .with_for_update()
        .first()
    )
    if current_active:
        current_active.active = 0
        current_active.status = "archived"
        plan.supersedes_plan_id = current_active.id
    plan.active = 1
    plan.status = "published"
    plan.approved_by = current_user.id
    plan.published_at = utcnow()
    db.add(SyncEvent(
        title="Plan nutricional publicado",
        detail=f"{current_user.name} aprobó y publicó la versión {plan.version} para {client.name}.",
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    db.refresh(plan)
    cache.delete_prefix("stats:")
    cache.delete_prefix("sync:")
    return plan


@router.put("/diet-plans/{plan_id}", response_model=DietPlanOut)
def update_diet_plan(
    plan_id: int,
    payload: DietPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    plan, client = _get_manageable_plan(plan_id, db, current_user, require_draft=True)
    updates = payload.model_dump(exclude_unset=True)
    protected_workflow_fields = {"active", "status", "version", "approved_by", "published_at", "supersedes_plan_id"}
    attempted = protected_workflow_fields.intersection(updates)
    if attempted:
        raise HTTPException(
            status_code=422,
            detail="El estado, versión y aprobación solo pueden cambiar mediante el flujo de publicación.",
        )
    candidate_metric_id = updates.get("based_on_metric_id", plan.based_on_metric_id)
    _validate_based_on_metric(db, client.id, candidate_metric_id)
    candidate_calculation = updates.get("calculation_json", plan.calculation_json)
    candidate_calories = updates.get("calories", plan.calories)
    if candidate_calculation and candidate_calculation != "{}":
        _validate_calculation_metadata(candidate_calculation, candidate_calories)
    for field, value in updates.items():
        setattr(plan, field, value)
    db.add(SyncEvent(
        title="Plan nutricional actualizado",
        detail=f"{current_user.name} actualizó el plan nutricional {plan.title} de {client.name}.",
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    db.refresh(plan)
    cache.delete_prefix("stats:")
    cache.delete_prefix("sync:")
    return plan


@router.delete("/diet-plans/{plan_id}")
def delete_diet_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    plan, client = _get_manageable_plan(plan_id, db, current_user)
    title = plan.title
    plan.active = 0
    plan.status = "archived"
    db.add(SyncEvent(
        title="Plan nutricional retirado",
        detail=f"{current_user.name} retiró el plan nutricional {title} de {client.name}.",
        source="Panel Coach",
        target="App Cliente",
        event_type="plan",
        actor_user_id=current_user.id,
        target_user_id=client.id,
    ))
    db.commit()
    cache.delete_prefix("stats:")
    cache.delete_prefix("sync:")
    return {"ok": True}
