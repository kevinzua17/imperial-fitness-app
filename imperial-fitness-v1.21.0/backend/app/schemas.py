from datetime import datetime
import json
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.core.nutrition import validate_meals_calorie_alignment, validate_meals_nutrition_alignment
from app.core.sanitize import CONTROL_CHARS_RE, JAVASCRIPT_URL_RE, SCRIPT_RE, EVENT_HANDLER_RE, sanitize_text




def sanitize_json_string(value: str, max_length: int = 50000) -> str:
    """Sanitize dangerous HTML/script fragments without escaping JSON quotes.

    The frontend stores rich plan payloads as JSON strings. Using html.escape() here
    converts quotes into entities and breaks JSON.parse() in the client view.
    """
    cleaned = CONTROL_CHARS_RE.sub("", value).strip()
    cleaned = SCRIPT_RE.sub("", cleaned)
    cleaned = EVENT_HANDLER_RE.sub(" data-removed=", cleaned)
    cleaned = JAVASCRIPT_URL_RE.sub("", cleaned)
    if len(cleaned) > max_length:
        raise ValueError(
            f"El contenido del plan supera el tamaño permitido de {max_length:,} caracteres. "
            "Reduce imágenes o notas demasiado extensas e intenta nuevamente."
        )
    # Keep it as valid JSON if the caller sent JSON.
    json.loads(cleaned)
    return cleaned

class SanitizedModel(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def sanitize_strings(cls, value):
        if isinstance(value, str):
            return sanitize_text(value)
        return value


def _validate_macro_calorie_alignment(calories: int | None, protein: int | None, carbs: int | None, fat: int | None):
    """Keep generated/manual diet plans inside realistic macro-calorie ranges.

    The app is not a medical device, but this prevents obviously broken plans from
    entering the pilot database, for example 2,000 kcal with 600 g of protein.
    """
    if calories is None or protein is None or carbs is None or fat is None:
        return
    estimated = (protein * 4) + (carbs * 4) + (fat * 9)
    if estimated <= 0:
        raise ValueError("El plan debe incluir macronutrientes calculables")
    allowed_gap = max(250, calories * 0.18)
    if abs(calories - estimated) > allowed_gap:
        raise ValueError("Las calorías del plan no son consistentes con proteína, carbohidratos y grasas")


class UserBase(SanitizedModel):
    auth_user_id: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str = Field(pattern="^(admin|trainer|client)$")
    status: str = Field(default="pending", pattern="^(pending|active|suspended|rejected)$")
    avatar_url: str | None = Field(default=None, max_length=500)
    assigned_trainer_id: int | None = None
    tokens: int = Field(default=0, ge=0, le=1_000_000)
    weight: float | None = Field(default=None, ge=20, le=300)
    height: float | None = Field(default=None, ge=80, le=250)
    age: int | None = Field(default=None, ge=10, le=100)
    gender: str | None = Field(default=None, pattern="^(M|F)$")
    body_fat: float | None = Field(default=None, ge=2, le=70)
    muscle_mass: float | None = Field(default=None, ge=5, le=150)
    goal: str | None = Field(default=None, max_length=160)
    activity_level: str | None = Field(default=None, pattern="^(sedentary|light|moderate|very_active|athlete)$")
    workouts_per_week: int | None = Field(default=None, ge=0, le=14)
    average_daily_steps: int | None = Field(default=None, ge=0, le=100000)
    occupation_activity: str | None = Field(default=None, pattern="^(sedentary|light|active|physical)$")
    phone_number: str | None = Field(default=None, max_length=40)
    whatsapp_opt_in: int = Field(default=1, ge=0, le=1)
    service_tier: str = Field(default="premium", pattern="^(lite|premium|hybrid)$")
    experience_mode: str = Field(default="premium", pattern="^(lite|premium|hybrid)$")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)


class PublicClientRegister(SanitizedModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    goal: str | None = Field(default=None, max_length=160)
    activity_level: str | None = Field(default=None, pattern="^(sedentary|light|moderate|very_active|athlete)$")
    workouts_per_week: int | None = Field(default=None, ge=0, le=14)
    average_daily_steps: int | None = Field(default=None, ge=0, le=100000)
    occupation_activity: str | None = Field(default=None, pattern="^(sedentary|light|active|physical)$")
    phone_number: str = Field(min_length=7, max_length=40)
    whatsapp_opt_in: int = Field(default=1, ge=0, le=1)
    weight: float | None = Field(default=None, ge=20, le=300)
    height: float | None = Field(default=None, ge=80, le=250)
    age: int | None = Field(default=None, ge=10, le=100)
    gender: str | None = Field(default=None, pattern="^(M|F)$")




class UserProfileUpdate(SanitizedModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    assigned_trainer_id: int | None = None
    weight: float | None = Field(default=None, ge=20, le=300)
    height: float | None = Field(default=None, ge=80, le=250)
    age: int | None = Field(default=None, ge=10, le=100)
    gender: str | None = Field(default=None, pattern="^(M|F)$")
    body_fat: float | None = Field(default=None, ge=2, le=70)
    muscle_mass: float | None = Field(default=None, ge=5, le=150)
    goal: str | None = Field(default=None, max_length=160)
    activity_level: str | None = Field(default=None, pattern="^(sedentary|light|moderate|very_active|athlete)$")
    workouts_per_week: int | None = Field(default=None, ge=0, le=14)
    average_daily_steps: int | None = Field(default=None, ge=0, le=100000)
    occupation_activity: str | None = Field(default=None, pattern="^(sedentary|light|active|physical)$")
    phone_number: str | None = Field(default=None, max_length=40)
    whatsapp_opt_in: int | None = Field(default=None, ge=0, le=1)
    service_tier: str | None = Field(default=None, pattern="^(lite|premium|hybrid)$")
    experience_mode: str | None = Field(default=None, pattern="^(lite|premium|hybrid)$")


class ChangePasswordRequest(SanitizedModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

class UserStatusUpdate(SanitizedModel):
    status: str = Field(pattern="^(pending|active|suspended|rejected)$")


class UserAccessUpdate(SanitizedModel):
    status: str | None = Field(default=None, pattern="^(pending|active|suspended|rejected)$")
    pending_at: datetime | None = None
    activated_at: datetime | None = None
    suspended_at: datetime | None = None
    status_changed_at: datetime | None = None
    access_note: str | None = Field(default=None, max_length=500)


class UserOut(UserBase):
    id: int
    pending_at: datetime | None = None
    activated_at: datetime | None = None
    suspended_at: datetime | None = None
    status_changed_at: datetime | None = None
    access_note: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(SanitizedModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(SanitizedModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    ok: bool = True
    detail: str
    reset_token_dev: str | None = None


class ResetPasswordRequest(SanitizedModel):
    token: str = Field(min_length=20, max_length=300)
    new_password: str = Field(min_length=8, max_length=72)


class FoodOut(BaseModel):
    id: int
    name: str
    category: str
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    cals_per_100g: float
    fiber_per_100g: float
    client_note: str
    trainer_note: str

    model_config = ConfigDict(from_attributes=True)




class FoodCreate(SanitizedModel):
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(pattern="^(protein|carb|fat|veg|drink|fruit|dairy|snack)$")
    protein_per_100g: float = Field(default=0, ge=0, le=100)
    carbs_per_100g: float = Field(default=0, ge=0, le=100)
    fat_per_100g: float = Field(default=0, ge=0, le=100)
    cals_per_100g: float = Field(default=0, ge=0, le=1000)
    fiber_per_100g: float = Field(default=0, ge=0, le=100)
    client_note: str = Field(default="", max_length=800)
    trainer_note: str = Field(default="", max_length=1200)

    @field_validator("cals_per_100g")
    @classmethod
    def calories_are_consistent(cls, value, info):
        data = info.data
        estimated = (data.get("protein_per_100g", 0) * 4) + (data.get("carbs_per_100g", 0) * 4) + (data.get("fat_per_100g", 0) * 9)
        if estimated > 0 and value > 0 and abs(value - estimated) > max(80, estimated * 0.35):
            raise ValueError("Las calorías no son consistentes con proteína/carbohidratos/grasas por 100g")
        return value


class FoodUpdate(SanitizedModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, pattern="^(protein|carb|fat|veg|drink|fruit|dairy|snack)$")
    protein_per_100g: float | None = Field(default=None, ge=0, le=100)
    carbs_per_100g: float | None = Field(default=None, ge=0, le=100)
    fat_per_100g: float | None = Field(default=None, ge=0, le=100)
    cals_per_100g: float | None = Field(default=None, ge=0, le=1000)
    fiber_per_100g: float | None = Field(default=None, ge=0, le=100)
    client_note: str | None = Field(default=None, max_length=800)
    trainer_note: str | None = Field(default=None, max_length=1200)


class NutritionTargetPreviewRequest(SanitizedModel):
    client_id: int | None = Field(default=None, gt=0)
    goal: str | None = Field(default=None, max_length=160)


class NutritionTargetOut(BaseModel):
    bmr: int
    bmr_source: str
    activity_level: str
    activity_factor: float
    maintenance_calories: int
    adjustment_percent: int
    target_calories: int
    protein_grams: int
    carbs_grams: int
    fat_grams: int
    goal_type: str
    goal_label: str
    formula_version: str
    calculated_at: str
    warnings: list[str]
    inputs: dict
    based_on_metric_id: int | None = None


class ScienceGuidelinesOut(BaseModel):
    nutrition: dict
    training: dict
    safety_notice: str


class EquivalenceRequest(SanitizedModel):
    original_food_id: int = Field(gt=0)
    substitute_food_id: int = Field(gt=0)
    original_grams: float = Field(gt=0, le=5000)
    max_substitute_calories: float | None = Field(default=None, ge=0, le=10000)


class EquivalenceResponse(BaseModel):
    original_food: str
    substitute_food: str
    original_grams: float
    substitute_grams: float
    basis: str
    client_note: str
    trainer_note: str
    original_macros: dict[str, float]
    substitute_macros: dict[str, float]
    deltas: dict[str, float]
    accuracy_percent: float
    compatibility: str
    is_exact: bool
    calorie_cap_applied: bool = False
    max_substitute_calories: float | None = None
    warning: str | None = None


class DietPlanCreate(BaseModel):
    client_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=160)
    calories: int = Field(ge=800, le=8000)
    protein: int = Field(ge=0, le=600)
    carbs: int = Field(ge=0, le=1000)
    fat: int = Field(ge=0, le=400)
    meals_json: str = Field(default="[]", max_length=30000)
    notes: str = Field(default="", max_length=4000)
    active: int = Field(default=0, ge=0, le=1)
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    version: int = Field(default=1, ge=1, le=10000)
    calculation_json: str = Field(default="{}", max_length=20000)
    based_on_metric_id: int | None = Field(default=None, gt=0)
    approved_by: int | None = Field(default=None, gt=0)
    published_at: datetime | None = None
    supersedes_plan_id: int | None = Field(default=None, gt=0)

    @field_validator("title", "notes", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("meals_json", mode="before")
    @classmethod
    def validate_meals_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 30000)
        return value

    @field_validator("calculation_json", mode="before")
    @classmethod
    def validate_calculation_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 20000)
        return value

    @model_validator(mode="after")
    def validate_macro_balance(self):
        _validate_macro_calorie_alignment(self.calories, self.protein, self.carbs, self.fat)
        if self.status == "published":
            validate_meals_nutrition_alignment(
                self.meals_json,
                target_calories=self.calories,
                target_protein=self.protein,
                target_carbs=self.carbs,
                target_fat=self.fat,
                require_full_day=True,
            )
        else:
            validate_meals_calorie_alignment(self.meals_json, self.calories, tolerance=0.20)
        if self.status == "published" and self.active != 1:
            raise ValueError("Un plan publicado debe quedar activo")
        return self


class DietPlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    calories: int | None = Field(default=None, ge=800, le=8000)
    protein: int | None = Field(default=None, ge=0, le=600)
    carbs: int | None = Field(default=None, ge=0, le=1000)
    fat: int | None = Field(default=None, ge=0, le=400)
    meals_json: str | None = Field(default=None, max_length=30000)
    notes: str | None = Field(default=None, max_length=4000)
    active: int | None = Field(default=None, ge=0, le=1)
    status: str | None = Field(default=None, pattern="^(draft|published|archived)$")
    version: int | None = Field(default=None, ge=1, le=10000)
    calculation_json: str | None = Field(default=None, max_length=20000)
    based_on_metric_id: int | None = Field(default=None, gt=0)
    approved_by: int | None = Field(default=None, gt=0)
    published_at: datetime | None = None
    supersedes_plan_id: int | None = Field(default=None, gt=0)

    @field_validator("title", "notes", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("meals_json", mode="before")
    @classmethod
    def validate_meals_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 30000)
        return value

    @field_validator("calculation_json", mode="before")
    @classmethod
    def validate_calculation_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 20000)
        return value

    @model_validator(mode="after")
    def validate_macro_balance_when_complete(self):
        _validate_macro_calorie_alignment(self.calories, self.protein, self.carbs, self.fat)
        if self.meals_json is not None and self.calories is not None:
            validate_meals_calorie_alignment(self.meals_json, self.calories, tolerance=0.20)
        return self


class DietPlanMealsUpdate(BaseModel):
    meals_json: str = Field(min_length=2, max_length=30000)

    @field_validator("meals_json", mode="before")
    @classmethod
    def validate_meals_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 30000)
        return value


class DietPlanOut(BaseModel):
    """Read model intentionally does not revalidate historical publication rules.

    Strict calorie/macro validation belongs to create/update/publish commands.
    Existing plans must remain readable so a legacy record can be reviewed and
    replaced safely instead of causing a response-validation error for clients.
    """
    id: int
    client_id: int
    title: str
    calories: int
    protein: int
    carbs: int
    fat: int
    meals_json: str = "[]"
    notes: str = ""
    active: int = 0
    status: str = "published"
    version: int = 1
    calculation_json: str = "{}"
    based_on_metric_id: int | None = None
    approved_by: int | None = None
    published_at: datetime | None = None
    supersedes_plan_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgressPhotoCreate(SanitizedModel):
    client_id: int = Field(gt=0)
    image_url: str = Field(min_length=8, max_length=600)
    label: str = Field(default="Frente", max_length=50)
    weight: float | None = Field(default=None, ge=20, le=300)
    body_fat: float | None = Field(default=None, ge=2, le=70)


class ProgressPhotoOut(ProgressPhotoCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BodyMetricCreate(SanitizedModel):
    user_id: int | None = Field(default=None, gt=0)
    weight: float = Field(gt=20, le=300)
    muscle_mass: float = Field(ge=5, le=150)
    body_fat: float = Field(ge=2, le=70)
    visceral_fat: float | None = Field(default=None, ge=1, le=20)
    bmr: float | None = Field(default=None, ge=500, le=6000)
    bmr_source: str | None = Field(default=None, pattern="^(inbody|mifflin_st_jeor|recorded_bmr|manual)$")
    bmi: float | None = Field(default=None, ge=10, le=80)
    measured_at: datetime | None = None


class BodyMetricUpdate(SanitizedModel):
    weight: float | None = Field(default=None, gt=20, le=300)
    muscle_mass: float | None = Field(default=None, ge=5, le=150)
    body_fat: float | None = Field(default=None, ge=2, le=70)
    visceral_fat: float | None = Field(default=None, ge=1, le=20)
    bmr: float | None = Field(default=None, ge=500, le=6000)
    bmr_source: str | None = Field(default=None, pattern="^(inbody|mifflin_st_jeor|recorded_bmr|manual)$")
    bmi: float | None = Field(default=None, ge=10, le=80)
    measured_at: datetime | None = None


class BodyMetricOut(BodyMetricCreate):
    id: int
    user_id: int
    recorded_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkoutSetCreate(SanitizedModel):
    user_id: int | None = Field(default=None, gt=0)
    exercise_name: str = Field(min_length=2, max_length=160)
    weight_kg: float = Field(ge=0, le=500)
    reps: int = Field(ge=1, le=100)
    set_number: int = Field(default=1, ge=1, le=20)
    rir: int | None = Field(default=None, ge=0, le=10)
    notes: str = Field(default="", max_length=1500)


class WorkoutSetOut(WorkoutSetCreate):
    id: int
    user_id: int
    suggestion: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncEventCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=160)
    detail: str = Field(min_length=2, max_length=4000)
    source: str = Field(min_length=2, max_length=120)
    target: str = Field(min_length=2, max_length=120)
    event_type: str = Field(default="system", max_length=50)
    actor_user_id: int | None = Field(default=None, gt=0)
    target_user_id: int | None = Field(default=None, gt=0)


class SyncEventOut(SyncEventCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AppSettingOut(BaseModel):
    key: str
    value: str


class AvatarUploadOut(BaseModel):
    user_id: int
    avatar_url: str


class LogoUploadOut(BaseModel):
    logo_url: str


class CommunityPostOut(BaseModel):
    id: int
    author_id: int
    author_name: str
    author_avatar_url: str | None = None
    content: str
    image_url: str | None = None
    tags: list[str]
    visibility: str = "public"
    visibility_label: str = "Comunidad"
    likes_count: int
    comments_count: int
    created_at: datetime


class CommunityCommentCreate(SanitizedModel):
    text: str = Field(min_length=1, max_length=1500)


class FriendshipCreate(SanitizedModel):
    addressee_id: int = Field(gt=0)


class FriendshipOut(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    participants_count: int
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime
    challenge_type: str = "transformation_8w"
    price_cop: int = 0
    compare_at_cop: int | None = None
    currency: str = "COP"
    launch_badge: str | None = None
    slots_total: int = 0
    slots_remaining: int | None = None
    duration_weeks: int = 8
    guarantee_enabled: bool = False
    min_completion_percent: int = 80
    min_improvement_indicators: int = 2
    refund_terms: str = ""
    training_days_per_week: int = 3
    target_focus: str = "recomposition"
    goal_label: str = "Recomposición corporal"
    goal_description: str = "Meta racional de 8 semanas."
    realistic_targets: dict = {}
    my_participation: dict | None = None
    my_progress: dict | None = None


class ChallengeCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=3000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str = Field(default="active", pattern="^(draft|active|closed|cancelled)$")
    challenge_type: str = Field(default="transformation_8w", max_length=60)
    price_cop: int = Field(default=80000, ge=0, le=50_000_000)
    compare_at_cop: int | None = Field(default=None, ge=0, le=50_000_000)
    currency: str = Field(default="COP", max_length=12)
    launch_badge: str = Field(default="Precio de lanzamiento", max_length=80)
    slots_total: int = Field(default=50, ge=0, le=100_000)
    duration_weeks: int = Field(default=8, ge=1, le=52)
    guarantee_enabled: bool = True
    min_completion_percent: int = Field(default=80, ge=0, le=100)
    min_improvement_indicators: int = Field(default=2, ge=0, le=10)
    refund_terms: str = Field(default="La garantía aplica si el participante cumple mínimo el 80% del reto y no mejora en al menos 2 indicadores medibles.", max_length=3000)
    training_days_per_week: int = Field(default=3, ge=1, le=7)
    target_focus: str = Field(default="recomposition", pattern="^(weight_loss|fat_loss|muscle_gain|recomposition)$")


class ChallengeParticipantOut(BaseModel):
    id: int
    challenge_id: int
    user_id: int
    progress_value: float
    status: str = "active"
    payment_status: str = "not_required"
    paid_amount_cop: int = 0
    baseline_weight: float | None = None
    baseline_waist: float | None = None
    baseline_body_fat: float | None = None
    baseline_muscle_mass: float | None = None
    final_weight: float | None = None
    final_waist: float | None = None
    final_body_fat: float | None = None
    final_muscle_mass: float | None = None
    completion_percent: int = 0
    improvement_indicators: int = 0
    guarantee_status: str = "en_proceso"
    admin_notes: str = ""
    joined_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignedRoutineCreate(BaseModel):
    client_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=180)
    objective: str = Field(default="", max_length=4000)
    payload_json: str = Field(default="{}", max_length=500000)
    active: int = Field(default=1, ge=0, le=1)

    @field_validator("title", "objective", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("payload_json", mode="before")
    @classmethod
    def validate_payload_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 500000)
        return value


class AssignedRoutineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    objective: str | None = Field(default=None, max_length=4000)
    payload_json: str | None = Field(default=None, max_length=500000)

    @field_validator("title", "objective", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("payload_json", mode="before")
    @classmethod
    def validate_payload_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 500000)
        return value


class AssignedRoutineOut(AssignedRoutineCreate):
    id: int
    trainer_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)




class RoutineTemplateCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    target_goal: str = Field(min_length=2, max_length=120)
    level: str = Field(min_length=2, max_length=50)
    days_per_week: int = Field(default=3, ge=1, le=7)
    description: str = Field(default="", max_length=3000)
    trainer_rationale: str = Field(default="", max_length=4000)
    payload_json: str = Field(default="{}", max_length=50000)

    @field_validator("title", "target_goal", "level", "description", "trainer_rationale", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("payload_json", mode="before")
    @classmethod
    def validate_payload_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 50000)
        return value


class RoutineTemplateUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    target_goal: str | None = Field(default=None, min_length=2, max_length=120)
    level: str | None = Field(default=None, min_length=2, max_length=50)
    days_per_week: int | None = Field(default=None, ge=1, le=7)
    description: str | None = Field(default=None, max_length=3000)
    trainer_rationale: str | None = Field(default=None, max_length=4000)
    payload_json: str | None = Field(default=None, max_length=50000)

    @field_validator("title", "target_goal", "level", "description", "trainer_rationale", mode="before")
    @classmethod
    def sanitize_public_text(cls, value):
        if isinstance(value, str):
            return sanitize_text(value, 4000)
        return value

    @field_validator("payload_json", mode="before")
    @classmethod
    def validate_payload_json(cls, value):
        if isinstance(value, str):
            return sanitize_json_string(value, 50000)
        return value


class RoutineTemplateOut(RoutineTemplateCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)




class ExerciseCreate(SanitizedModel):
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=3000)
    image_url: str = Field(default="", max_length=700)
    category: str = Field(default="general", max_length=80)
    segment: str = Field(default="superior", pattern="^(superior|inferior|core|cardio|full_body)$")
    movement_pattern: str = Field(default="isolation", max_length=50)
    primary_muscle: str = Field(default="", max_length=120)
    secondary_muscles: list[str] = Field(default_factory=list)
    equipment: str = Field(default="", max_length=220)
    level: str = Field(default="Intermedio", max_length=60)
    is_active: bool = True
    is_visible: bool = True
    is_routine_eligible: bool = True
    review_status: str = Field(default="approved", pattern="^(pending|approved|rejected)$")
    source: str = Field(default="imperial", max_length=80)
    coach_notes: str = Field(default="", max_length=3000)


class ExerciseUpdate(SanitizedModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    image_url: str | None = Field(default=None, max_length=700)
    category: str | None = Field(default=None, max_length=80)
    segment: str | None = Field(default=None, pattern="^(superior|inferior|core|cardio|full_body)$")
    movement_pattern: str | None = Field(default=None, max_length=50)
    primary_muscle: str | None = Field(default=None, max_length=120)
    secondary_muscles: list[str] | None = None
    equipment: str | None = Field(default=None, max_length=220)
    level: str | None = Field(default=None, max_length=60)
    is_active: bool | None = None
    is_visible: bool | None = None
    is_routine_eligible: bool | None = None
    review_status: str | None = Field(default=None, pattern="^(pending|approved|rejected)$")
    source: str | None = Field(default=None, max_length=80)
    coach_notes: str | None = Field(default=None, max_length=3000)


class ExerciseOut(ExerciseCreate):
    id: int


class UserLimitationCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    body_area: str = Field(pattern="^(rodilla|hombro|lumbar|codo|muneca|cadera|tobillo|cuello|otro)$")
    severity: str = Field(default="leve", pattern="^(leve|moderada|alta)$")
    comment: str = Field(default="", max_length=2000)
    trainer_note: str = Field(default="", max_length=2000)
    status: str = Field(default="active", pattern="^(active|resolved)$")


class UserLimitationUpdate(SanitizedModel):
    body_area: str | None = Field(default=None, pattern="^(rodilla|hombro|lumbar|codo|muneca|cadera|tobillo|cuello|otro)$")
    severity: str | None = Field(default=None, pattern="^(leve|moderada|alta)$")
    comment: str | None = Field(default=None, max_length=2000)
    trainer_note: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, pattern="^(active|resolved)$")


class UserLimitationOut(UserLimitationCreate):
    id: int
    created_by: int | None = None
    created_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(SanitizedModel):
    receiver_id: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=4000)


class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    text: str
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RewardProductCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=3000)
    cost: int = Field(gt=0, le=1_000_000)
    stock: int = Field(default=0, ge=0)
    image_url: str | None = Field(default=None, max_length=600)


class RewardProductOut(RewardProductCreate):
    id: int
    active: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RewardEventCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    points: int = Field(ge=-1_000_000, le=1_000_000)
    reason: str = Field(min_length=2, max_length=180)
    source_type: str = Field(default="manual", max_length=60)


class RewardEventOut(RewardEventCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RewardRedeemRequest(SanitizedModel):
    product_id: int = Field(gt=0)


class RewardBalanceOut(BaseModel):
    user_id: int
    balance: int



class DailyCheckinCreate(SanitizedModel):
    training_status: str = Field(pattern="^(trained|later|missed|rest)$")
    nutrition_status: str = Field(pattern="^(completed|partial|missed|later)$")
    planned_training_time: str | None = Field(default=None, max_length=40)
    mood: str | None = Field(default=None, max_length=40)
    notes: str = Field(default="", max_length=1200)


class DailyCheckinOut(DailyCheckinCreate):
    id: int
    user_id: int
    checkin_date: str
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckinClientSummary(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    phone_number: str | None = None
    whatsapp_opt_in: int = 1
    assigned_trainer_id: int | None = None
    last_checkin_date: str | None = None
    last_training_status: str | None = None
    last_nutrition_status: str | None = None
    training_done: int = 0
    training_later: int = 0
    training_missed: int = 0
    nutrition_completed: int = 0
    nutrition_partial: int = 0
    nutrition_missed: int = 0
    days_without_checkin: int = 0
    adherence_score: int = 0
    risk_level: str = "Bajo"


class MembershipCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    plan_name: str = Field(min_length=2, max_length=120)
    starts_at: datetime
    ends_at: datetime
    status: str = Field(default="active", max_length=30)


class MembershipOut(MembershipCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    amount: float = Field(gt=0, le=1_000_000_000)
    method: str = Field(default="manual", max_length=60)
    reference: str | None = Field(default=None, max_length=160)
    status: str = Field(default="paid", max_length=30)


class PaymentOut(PaymentCreate):
    id: int
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=160)
    amount: float = Field(gt=0, le=1_000_000_000)
    category: str = Field(default="operativo", max_length=80)


class ExpenseOut(ExpenseCreate):
    id: int
    spent_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceCreate(SanitizedModel):
    user_id: int | None = Field(default=None, gt=0)
    source: str = Field(default="manual", max_length=60)


class AttendanceOut(BaseModel):
    id: int
    user_id: int
    source: str
    checked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RetentionAlertOut(BaseModel):
    id: int
    user_id: int
    client_name: str
    risk: str
    reason: str
    suggested_action: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpecialistSuggestionRequest(SanitizedModel):
    client_id: int | None = Field(default=None, gt=0)
    client_name: str | None = Field(default=None, max_length=120)
    goal: str = Field(min_length=2, max_length=220)
    question: str = Field(min_length=5, max_length=2500)
    recent_metrics: str | None = Field(default=None, max_length=2500)
    current_diet: str | None = Field(default=None, max_length=4000)
    current_routine: str | None = Field(default=None, max_length=4000)


class SpecialistSuggestionResponse(BaseModel):
    summary: str
    recommendations: list[str]
    cautions: list[str]
    coach_message_draft: str
    source: str = "openai"