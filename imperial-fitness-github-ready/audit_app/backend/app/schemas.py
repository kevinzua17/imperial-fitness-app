from datetime import datetime
import json
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
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
    cleaned = cleaned[:max_length]
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
    body_fat: float | None = Field(default=None, ge=2, le=70)
    muscle_mass: float | None = Field(default=None, ge=5, le=150)
    goal: str | None = Field(default=None, max_length=160)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)


class PublicClientRegister(SanitizedModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    goal: str | None = Field(default=None, max_length=160)
    weight: float | None = Field(default=None, ge=20, le=300)
    height: float | None = Field(default=None, ge=80, le=250)




class UserProfileUpdate(SanitizedModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    assigned_trainer_id: int | None = None
    weight: float | None = Field(default=None, ge=20, le=300)
    height: float | None = Field(default=None, ge=80, le=250)
    body_fat: float | None = Field(default=None, ge=2, le=70)
    muscle_mass: float | None = Field(default=None, ge=5, le=150)
    goal: str | None = Field(default=None, max_length=160)


class ChangePasswordRequest(SanitizedModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

class UserStatusUpdate(SanitizedModel):
    status: str = Field(pattern="^(pending|active|suspended|rejected)$")


class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True




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


class ScienceGuidelinesOut(BaseModel):
    nutrition: dict
    training: dict
    safety_notice: str


class EquivalenceRequest(SanitizedModel):
    original_food_id: int = Field(gt=0)
    substitute_food_id: int = Field(gt=0)
    original_grams: float = Field(gt=0, le=5000)


class EquivalenceResponse(BaseModel):
    original_food: str
    substitute_food: str
    original_grams: float
    substitute_grams: float
    basis: str
    client_note: str
    trainer_note: str


class DietPlanCreate(BaseModel):
    client_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=160)
    calories: int = Field(ge=800, le=8000)
    protein: int = Field(ge=0, le=600)
    carbs: int = Field(ge=0, le=1000)
    fat: int = Field(ge=0, le=400)
    meals_json: str = Field(default="[]", max_length=30000)
    notes: str = Field(default="", max_length=4000)
    active: int = Field(default=1, ge=0, le=1)

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

    @model_validator(mode="after")
    def validate_macro_balance(self):
        _validate_macro_calorie_alignment(self.calories, self.protein, self.carbs, self.fat)
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

    @model_validator(mode="after")
    def validate_macro_balance_when_complete(self):
        _validate_macro_calorie_alignment(self.calories, self.protein, self.carbs, self.fat)
        return self


class DietPlanOut(DietPlanCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProgressPhotoCreate(SanitizedModel):
    client_id: int = Field(gt=0)
    image_url: str = Field(min_length=8, max_length=600)
    label: str = Field(default="Frente", max_length=50)
    weight: float | None = Field(default=None, ge=20, le=300)
    body_fat: float | None = Field(default=None, ge=2, le=70)


class ProgressPhotoOut(ProgressPhotoCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BodyMetricCreate(SanitizedModel):
    user_id: int | None = Field(default=None, gt=0)
    weight: float = Field(gt=20, le=300)
    muscle_mass: float = Field(ge=5, le=150)
    body_fat: float = Field(ge=2, le=70)
    visceral_fat: float | None = Field(default=None, ge=1, le=40)
    bmr: float | None = Field(default=None, ge=500, le=6000)
    bmi: float | None = Field(default=None, ge=10, le=80)


class BodyMetricOut(BodyMetricCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    participants_count: int
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime


class ChallengeCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=3000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str = Field(default="active", pattern="^(draft|active|closed|cancelled)$")


class ChallengeParticipantOut(BaseModel):
    id: int
    challenge_id: int
    user_id: int
    progress_value: float
    joined_at: datetime

    class Config:
        from_attributes = True


class AssignedRoutineCreate(BaseModel):
    client_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=180)
    objective: str = Field(default="", max_length=4000)
    payload_json: str = Field(default="{}", max_length=50000)
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
            return sanitize_json_string(value, 50000)
        return value


class AssignedRoutineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    objective: str | None = Field(default=None, max_length=4000)
    payload_json: str | None = Field(default=None, max_length=50000)
    active: int | None = Field(default=None, ge=0, le=1)

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
            return sanitize_json_string(value, 50000)
        return value


class AssignedRoutineOut(AssignedRoutineCreate):
    id: int
    trainer_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True




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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


class RewardEventCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    points: int = Field(ge=-1_000_000, le=1_000_000)
    reason: str = Field(min_length=2, max_length=180)
    source_type: str = Field(default="manual", max_length=60)


class RewardEventOut(RewardEventCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RewardRedeemRequest(SanitizedModel):
    product_id: int = Field(gt=0)


class RewardBalanceOut(BaseModel):
    user_id: int
    balance: int


class MembershipCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    plan_name: str = Field(min_length=2, max_length=120)
    starts_at: datetime
    ends_at: datetime
    status: str = Field(default="active", max_length=30)


class MembershipOut(MembershipCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentCreate(SanitizedModel):
    user_id: int = Field(gt=0)
    amount: float = Field(gt=0, le=1_000_000_000)
    method: str = Field(default="manual", max_length=60)
    reference: str | None = Field(default=None, max_length=160)
    status: str = Field(default="paid", max_length=30)


class PaymentOut(PaymentCreate):
    id: int
    paid_at: datetime

    class Config:
        from_attributes = True


class ExpenseCreate(SanitizedModel):
    title: str = Field(min_length=2, max_length=160)
    amount: float = Field(gt=0, le=1_000_000_000)
    category: str = Field(default="operativo", max_length=80)


class ExpenseOut(ExpenseCreate):
    id: int
    spent_at: datetime

    class Config:
        from_attributes = True


class AttendanceCreate(SanitizedModel):
    user_id: int | None = Field(default=None, gt=0)
    source: str = Field(default="manual", max_length=60)


class AttendanceOut(BaseModel):
    id: int
    user_id: int
    source: str
    checked_at: datetime

    class Config:
        from_attributes = True


class RetentionAlertOut(BaseModel):
    id: int
    user_id: int
    client_name: str
    risk: str
    reason: str
    suggested_action: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


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