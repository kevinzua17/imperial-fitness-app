from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.uploads import save_image_upload
from app.database import get_db
from app.deps import get_current_user
from app.models import BodyMetric, ProgressPhoto, User, WorkoutSetLog
from app.schemas import BodyMetricCreate, BodyMetricOut, ProgressPhotoCreate, ProgressPhotoOut, WorkoutSetCreate, WorkoutSetOut


router = APIRouter(prefix="/progress", tags=["progress"])


def _assert_can_access_client(client_id: int, current_user: User, db: Session) -> None:
    if current_user.role == "client" and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    if current_user.role == "trainer":
        client = db.get(User, client_id)
        if not client or client.assigned_trainer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Solo puedes gestionar clientes asignados")


def _target_user_id(payload_user_id: int | None, current_user: User, db: Session) -> int:
    if current_user.role == "client":
        return current_user.id
    if payload_user_id is None:
        raise HTTPException(status_code=400, detail="Debes enviar user_id")
    _assert_can_access_client(payload_user_id, current_user, db)
    return payload_user_id


def _calculate_progression_suggestion(exercise_name: str, weight_kg: float, reps: int, rir: int | None, db: Session, user_id: int) -> str:
    previous = (
        db.query(WorkoutSetLog)
        .filter(WorkoutSetLog.user_id == user_id, WorkoutSetLog.exercise_name == exercise_name)
        .order_by(WorkoutSetLog.created_at.desc())
        .first()
    )
    next_weight_small = round(weight_kg + 2.5, 1)
    next_weight_big = round(weight_kg * 1.05, 1)
    if reps >= 15 and (rir is None or rir >= 1):
        return f"Excelente control: aumenta a {next_weight_big} kg en el próximo entrenamiento o sube 2.5 kg en la siguiente serie si mantienes técnica limpia."
    if reps >= 12 and (rir is None or rir >= 2):
        return f"Estás por encima del rango objetivo: prueba {next_weight_small} kg en la siguiente serie y busca 8-12 reps con buena técnica."
    if 8 <= reps < 12:
        if previous and weight_kg > previous.weight_kg and reps >= previous.reps:
            return "Progreso positivo: mantén este peso hasta lograr 12 reps sólidas antes de subir carga."
        return "Mantén el peso actual y busca sumar 1-2 reps antes de aumentar carga."
    if reps < 8:
        return "Carga alta para el rango actual: conserva o baja 5-10% el peso para priorizar técnica y volumen efectivo."
    return "Registro guardado. Mantén técnica limpia y progresa gradualmente."


@router.get("/photos", response_model=list[ProgressPhotoOut])
def list_progress_photos(
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ProgressPhoto).order_by(ProgressPhoto.created_at.desc())
    if current_user.role == "client":
        query = query.filter(ProgressPhoto.client_id == current_user.id)
    elif current_user.role == "trainer":
        assigned_ids = [row.id for row in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
        query = query.filter(ProgressPhoto.client_id.in_(assigned_ids))
    if client_id:
        if current_user.role == "client" and client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Permiso insuficiente")
        query = query.filter(ProgressPhoto.client_id == client_id)
    return query.all()


@router.post("/photos", response_model=ProgressPhotoOut)
def create_progress_photo(
    payload: ProgressPhotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_access_client(payload.client_id, current_user, db)
    photo = ProgressPhoto(**payload.model_dump())
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.post("/photos/upload", response_model=ProgressPhotoOut)
async def upload_progress_photo(
    client_id: int = Form(...),
    label: str = Form("Frente"),
    weight: float | None = Form(None),
    body_fat: float | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_access_client(client_id, current_user, db)
    image_url = await save_image_upload(file, "progress")
    photo = ProgressPhoto(
        client_id=client_id,
        image_url=image_url,
        label=label,
        weight=weight,
        body_fat=body_fat,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.post("/body-metrics", response_model=BodyMetricOut)
def create_body_metric(
    payload: BodyMetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = _target_user_id(payload.user_id, current_user, db)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    bmi = payload.bmi
    if bmi is None and user.height:
        height_m = user.height / 100
        bmi = round(payload.weight / (height_m * height_m), 2)

    bmr = payload.bmr
    if bmr is None:
        # Fórmula práctica Mifflin-St Jeor aproximada. Edad no está persistida aún, se usa 30 como default operativo.
        bmr = round((10 * payload.weight) + (6.25 * (user.height or 170)) - (5 * 30) + 5, 0)

    metric = BodyMetric(
        user_id=user_id,
        weight=payload.weight,
        muscle_mass=payload.muscle_mass,
        body_fat=payload.body_fat,
        visceral_fat=payload.visceral_fat,
        bmr=bmr,
        bmi=bmi,
    )
    user.weight = payload.weight
    user.muscle_mass = payload.muscle_mass
    user.body_fat = payload.body_fat
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.get("/history/{user_id}", response_model=list[BodyMetricOut])
def get_body_metric_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_access_client(user_id, current_user, db)
    return (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id)
        .order_by(BodyMetric.created_at.asc())
        .all()
    )


@router.post("/workout-sets", response_model=WorkoutSetOut)
def create_workout_set(
    payload: WorkoutSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = _target_user_id(payload.user_id, current_user, db)
    suggestion = _calculate_progression_suggestion(payload.exercise_name, payload.weight_kg, payload.reps, payload.rir, db, user_id)
    log = WorkoutSetLog(
        user_id=user_id,
        exercise_name=payload.exercise_name,
        weight_kg=payload.weight_kg,
        reps=payload.reps,
        set_number=payload.set_number,
        rir=payload.rir,
        notes=payload.notes,
        suggestion=suggestion,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/workout-history/{user_id}", response_model=list[WorkoutSetOut])
def get_workout_history(
    user_id: int,
    exercise_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_access_client(user_id, current_user, db)
    query = db.query(WorkoutSetLog).filter(WorkoutSetLog.user_id == user_id)
    if exercise_name:
        query = query.filter(WorkoutSetLog.exercise_name == exercise_name)
    return query.order_by(WorkoutSetLog.created_at.asc()).all()