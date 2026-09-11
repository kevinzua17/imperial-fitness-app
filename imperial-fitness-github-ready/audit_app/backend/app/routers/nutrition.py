from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user, require_admin_or_trainer
from app.models import DietPlan, Food, SyncEvent, User
from app.schemas import DietPlanCreate, DietPlanOut, DietPlanUpdate, EquivalenceRequest, EquivalenceResponse, FoodCreate, FoodOut, FoodUpdate, ScienceGuidelinesOut
from app.core.sanitize import sanitize_text


router = APIRouter(prefix="/nutrition", tags=["nutrition"])


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

    if original.category in ["carb", "fruit"] and substitute.carbs_per_100g > 0:
        original_macro = (payload.original_grams * original.carbs_per_100g) / 100
        substitute_grams = (original_macro * 100) / substitute.carbs_per_100g
        basis = "carbohidratos"
    elif original.category in ["protein", "dairy"] and substitute.protein_per_100g > 0:
        original_macro = (payload.original_grams * original.protein_per_100g) / 100
        substitute_grams = (original_macro * 100) / substitute.protein_per_100g
        basis = "proteína"
    else:
        original_cals = (payload.original_grams * original.cals_per_100g) / 100
        substitute_grams = (original_cals * 100) / max(substitute.cals_per_100g, 1)
        basis = "calorías"

    return {
        "original_food": original.name,
        "substitute_food": substitute.name,
        "original_grams": payload.original_grams,
        "substitute_grams": round(substitute_grams, 1),
        "basis": basis,
        "client_note": substitute.client_note,
        "trainer_note": substitute.trainer_note,
    }


@router.get("/diet-plans", response_model=list[DietPlanOut])
def list_diet_plans(
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DietPlan).filter(DietPlan.active == 1).order_by(DietPlan.created_at.desc())
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
def get_my_diet_plan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.client_id == current_user.id, DietPlan.active == 1).order_by(DietPlan.created_at.desc()).first()
    return plan


@router.post("/diet-plans", response_model=DietPlanOut)
def create_diet_plan(
    payload: DietPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    client = db.get(User, payload.client_id)
    if not client or client.role != "client":
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if current_user.role == "trainer" and client.assigned_trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes crear dietas para clientes asignados")
    db.query(DietPlan).filter(DietPlan.client_id == payload.client_id, DietPlan.active == 1).update({"active": 0})
    plan_data = payload.model_dump()
    plan_data["active"] = 1
    plan = DietPlan(**plan_data)
    db.add(plan)
    db.flush()
    db.add(SyncEvent(
        title="Plan nutricional asignado",
        detail=f"{current_user.name} asignó el plan nutricional {plan.title} a {client.name}.",
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


def _get_manageable_plan(plan_id: int, db: Session, current_user: User) -> tuple[DietPlan, User]:
    plan = db.get(DietPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan nutricional no encontrado")
    client = _can_manage_client(db, plan.client_id, current_user)
    return plan, client


@router.put("/diet-plans/{plan_id}", response_model=DietPlanOut)
def update_diet_plan(
    plan_id: int,
    payload: DietPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    plan, client = _get_manageable_plan(plan_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)
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
