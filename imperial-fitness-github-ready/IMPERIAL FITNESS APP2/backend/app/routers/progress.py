from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.private_files import create_private_asset_access_url, private_asset_belongs_to_folder, private_file_response
from app.core.uploads import save_image_upload
from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user
from app.models import BodyMetric, DietPlan, ProgressPhoto, SyncEvent, User, WorkoutSetLog
from app.schemas import BodyMetricCreate, BodyMetricOut, BodyMetricUpdate, ProgressPhotoCreate, ProgressPhotoOut, WorkoutSetCreate, WorkoutSetOut
from app.core.time import utcnow


router = APIRouter(prefix="/progress", tags=["progress"])


def _public_photo_url(image_url: str | None) -> str | None:
    return create_private_asset_access_url(image_url)


def _prepare_progress_photo_response(photo: ProgressPhoto) -> ProgressPhotoOut:
    # Build a response copy instead of mutating the tracked SQLAlchemy row. This
    # prevents a short-lived access URL from ever being flushed back to the DB.
    payload = ProgressPhotoOut.model_validate(photo)
    return payload.model_copy(update={"image_url": _public_photo_url(photo.image_url) or photo.image_url})



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


def _calculate_progression_suggestion(
    exercise_name: str,
    weight_kg: float,
    reps: int,
    rir: int | None,
    db: Session,
    user_id: int,
    *,
    set_number: int = 1,
    target_min_reps: int | None = None,
    target_max_reps: int | None = None,
    target_sets: int | None = None,
    target_rir: int | None = None,
) -> str:
    """Sugerencia conservadora de doble progresión.

    Cuando la rutina envía contexto, la carga solo sube tras completar la
    última serie prescrita y alcanzar el techo del rango en todas las series
    recientes de la sesión. Sin contexto mantiene un fallback 8-12.
    """
    min_reps = int(target_min_reps or 8)
    max_reps = int(target_max_reps or 12)
    if max_reps < min_reps:
        min_reps, max_reps = max_reps, min_reps
    prescribed_sets = max(1, int(target_sets or 1))
    current_set = max(1, int(set_number or 1))

    recent_rows: list[WorkoutSetLog] = []
    if prescribed_sets > 1:
        recent_rows = (
            db.query(WorkoutSetLog)
            .filter(
                WorkoutSetLog.user_id == user_id,
                WorkoutSetLog.exercise_name == exercise_name,
                WorkoutSetLog.created_at >= utcnow() - timedelta(hours=12),
            )
            .order_by(WorkoutSetLog.created_at.desc(), WorkoutSetLog.id.desc())
            .limit(max(0, prescribed_sets - 1))
            .all()
        )
        recent_rows.reverse()

    reps_session = [row.reps for row in recent_rows] + [reps]
    rir_session = [row.rir for row in recent_rows] + [rir]
    if len(reps_session) > prescribed_sets:
        reps_session = reps_session[-prescribed_sets:]
        rir_session = rir_session[-prescribed_sets:]

    if reps < min_reps:
        return (
            f"Quedaste por debajo del rango {min_reps}-{max_reps}: conserva o reduce 5-10% la carga "
            "hasta recuperar técnica, recorrido y repeticiones objetivo."
        )

    # Antes de la última serie no propone subir carga: primero completa el
    # volumen prescrito para evitar decisiones basadas en una única serie.
    if prescribed_sets > 1 and current_set < prescribed_sets:
        if reps >= max_reps:
            return (
                f"Serie dentro del techo ({max_reps} reps). Mantén {weight_kg:g} kg y completa las "
                "series restantes antes de decidir una subida de carga."
            )
        return f"Mantén {weight_kg:g} kg y busca acumular repeticiones dentro de {min_reps}-{max_reps} con el RIR prescrito."

    enough_sets = len(reps_session) >= prescribed_sets
    all_at_top = enough_sets and all(value >= max_reps for value in reps_session[-prescribed_sets:])
    if target_rir is None:
        rir_ok = all(value is None or value >= 1 for value in rir_session[-prescribed_sets:])
    else:
        rir_ok = all(value is None or value >= target_rir for value in rir_session[-prescribed_sets:])

    if all_at_top and rir_ok:
        increment = max(0.5, round((weight_kg * 0.025) * 2) / 2)
        next_weight = round(weight_kg + increment, 1)
        return (
            f"Progresión lista: completaste {prescribed_sets} series en el techo del rango {min_reps}-{max_reps} "
            f"sin exceder el esfuerzo objetivo. Próxima sesión prueba ~{next_weight:g} kg (+{increment:g} kg) "
            "y vuelve a construir repeticiones desde la parte baja del rango."
        )

    if all_at_top and not rir_ok:
        return (
            "Completaste el techo de repeticiones, pero con menos RIR del prescrito. Mantén la carga hasta "
            "repetir el rendimiento con mejor reserva y técnica antes de aumentarla."
        )

    if any(value < min_reps for value in reps_session[-prescribed_sets:]):
        return (
            f"Alguna serie cayó por debajo de {min_reps} reps. Mantén o reduce ligeramente la carga y prioriza "
            "completar todas las series dentro del rango antes de progresar."
        )

    return (
        f"Mantén {weight_kg:g} kg. Próximo objetivo: sumar 1-2 repeticiones totales entre las series hasta "
        f"alcanzar {max_reps} reps en todas con el RIR previsto."
    )


def _clean_measurement_date(value: datetime | None) -> datetime:
    """Fecha real de medición tomada en InBody o báscula.

    Se guarda separada de la fecha de digitación para que las gráficas y retos usen
    el día real de la toma, sin perder la trazabilidad de cuándo se cargó en la app.
    """
    measured_at = value or utcnow()
    if measured_at.tzinfo is not None:
        measured_at = measured_at.astimezone().replace(tzinfo=None)
    measured_at = measured_at.replace(microsecond=0)
    now = utcnow().replace(microsecond=0)
    if measured_at > now + timedelta(days=1):
        raise HTTPException(status_code=422, detail="La fecha de medición no puede ser futura")
    return measured_at


def _recalculate_metric_values(metric: BodyMetric, user: User) -> None:
    if metric.bmi is None and user.height:
        height_m = user.height / 100
        metric.bmi = round(metric.weight / (height_m * height_m), 2)
    if metric.bmr is None and user.height and user.age and user.gender in {"M", "F"}:
        sex_constant = -161 if user.gender == "F" else 5
        metric.bmr = round((10 * metric.weight) + (6.25 * user.height) - (5 * user.age) + sex_constant, 0)
        metric.bmr_source = "mifflin_st_jeor"


def _metric_effective_date_expr():
    # Fecha que debe ver la app: el día real en que se tomó la medición, no el día de digitación.
    return func.coalesce(BodyMetric.measured_at, BodyMetric.created_at)


def _is_latest_body_metric(db: Session, user_id: int, measured_at: datetime, metric_id: int | None = None) -> bool:
    query = db.query(BodyMetric).filter(BodyMetric.user_id == user_id)
    if metric_id is not None:
        query = query.filter(BodyMetric.id != metric_id)
    latest = query.order_by(_metric_effective_date_expr().desc(), BodyMetric.id.desc()).first()
    return latest is None or measured_at >= (latest.measured_at or latest.created_at)


def _sync_user_current_metric_if_latest(db: Session, user: User, metric: BodyMetric) -> None:
    measured_at = metric.measured_at or metric.created_at
    if not _is_latest_body_metric(db, user.id, measured_at, metric.id):
        return
    user.weight = metric.weight
    user.muscle_mass = metric.muscle_mass
    user.body_fat = metric.body_fat


def _sync_user_from_latest_body_metric(db: Session, user: User) -> None:
    latest = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user.id)
        .order_by(_metric_effective_date_expr().desc(), BodyMetric.id.desc())
        .first()
    )
    if latest:
        user.weight = latest.weight
        user.muscle_mass = latest.muscle_mass
        user.body_fat = latest.body_fat


def _latest_body_metric(db: Session, user_id: int) -> BodyMetric | None:
    return (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id)
        .order_by(_metric_effective_date_expr().desc(), BodyMetric.id.desc())
        .first()
    )


def _sync_active_diet_from_metric(db: Session, user: User, metric: BodyMetric, actor_user_id: int) -> None:
    """Never mutate a published diet from a body measurement.

    Measurements can change because of hydration, device variability or data-entry
    corrections. We only create an audit notification so a coach can generate and
    approve a new draft from the nutrition endpoint.
    """
    active_plan = (
        db.query(DietPlan)
        .filter(DietPlan.client_id == user.id, DietPlan.active == 1, DietPlan.status == "published")
        .order_by(DietPlan.created_at.desc())
        .first()
    )
    if not active_plan:
        return
    db.add(SyncEvent(
        title="Revisión nutricional pendiente",
        detail=(
            f"{user.name} registró una nueva medición corporal. "
            "El plan publicado no fue modificado; genera un borrador y apruébalo antes de reemplazarlo."
        ),
        source="Seguimiento corporal",
        target="Plan Nutricional",
        event_type="plan_review",
        actor_user_id=actor_user_id,
        target_user_id=user.id,
    ))
    cache.delete_prefix("sync:")


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
    return [_prepare_progress_photo_response(photo) for photo in query.all()]


@router.get("/photos/file/{token}")
def get_progress_photo_file(token: str):
    return private_file_response(token)


@router.post("/photos", response_model=ProgressPhotoOut)
def create_progress_photo(
    payload: ProgressPhotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_access_client(payload.client_id, current_user, db)
    if not private_asset_belongs_to_folder(payload.image_url, f"progress-user-{payload.client_id}"):
        raise HTTPException(status_code=400, detail="Las fotos de progreso deben subirse desde el cargador privado del cliente.")
    photo = ProgressPhoto(**payload.model_dump())
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _prepare_progress_photo_response(photo)


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
    latest_metric = _latest_body_metric(db, client_id)
    target_user = db.get(User, client_id)
    resolved_weight = weight if weight is not None else (latest_metric.weight if latest_metric else (target_user.weight if target_user else None))
    resolved_body_fat = body_fat if body_fat is not None else (latest_metric.body_fat if latest_metric else (target_user.body_fat if target_user else None))
    image_url = await save_image_upload(file, f"progress-user-{client_id}", private=True)
    photo = ProgressPhoto(
        client_id=client_id,
        image_url=image_url,
        label=label,
        weight=resolved_weight,
        body_fat=resolved_body_fat,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _prepare_progress_photo_response(photo)


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

    measured_at = _clean_measurement_date(payload.measured_at)
    bmi = payload.bmi
    if bmi is None and user.height:
        height_m = user.height / 100
        bmi = round(payload.weight / (height_m * height_m), 2)

    bmr = payload.bmr
    bmr_source = payload.bmr_source
    if bmr is not None and not bmr_source:
        # No atribuir InBody sin que el cliente/profesional lo confirme explícitamente.
        bmr_source = "recorded_bmr"
    if bmr is None and user.height and user.age and user.gender in {"M", "F"}:
        sex_constant = -161 if user.gender == "F" else 5
        bmr = round((10 * payload.weight) + (6.25 * user.height) - (5 * user.age) + sex_constant, 0)
        bmr_source = "mifflin_st_jeor"

    metric = BodyMetric(
        user_id=user_id,
        weight=payload.weight,
        muscle_mass=payload.muscle_mass,
        body_fat=payload.body_fat,
        visceral_fat=payload.visceral_fat,
        bmr=bmr,
        bmr_source=bmr_source,
        bmi=bmi,
        measured_at=measured_at,
        recorded_at=utcnow().replace(microsecond=0),
        created_at=measured_at,
    )
    _sync_user_current_metric_if_latest(db, user, metric)
    db.add(metric)
    db.flush()
    if _is_latest_body_metric(db, user.id, metric.measured_at or metric.created_at, metric.id):
        _sync_active_diet_from_metric(db, user, metric, current_user.id)
    db.commit()
    db.refresh(metric)
    return metric


@router.patch("/body-metrics/{metric_id}", response_model=BodyMetricOut)
def update_body_metric(
    metric_id: int,
    payload: BodyMetricUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    metric = db.get(BodyMetric, metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="Medición no encontrada")
    _assert_can_access_client(metric.user_id, current_user, db)
    user = db.get(User, metric.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = payload.model_dump(exclude_unset=True)
    if "measured_at" in data:
        measured_at = _clean_measurement_date(data.pop("measured_at"))
        metric.measured_at = measured_at
        # Mantiene compatibilidad con pantallas antiguas que ordenan por created_at.
        metric.created_at = measured_at
    for key, value in data.items():
        if hasattr(metric, key):
            setattr(metric, key, value)
    if payload.bmi is None:
        metric.bmi = None
    if "bmr" in data and payload.bmr is None:
        metric.bmr = None
        metric.bmr_source = None
    _recalculate_metric_values(metric, user)
    if _is_latest_body_metric(db, user.id, metric.measured_at or metric.created_at, metric.id):
        _sync_user_current_metric_if_latest(db, user, metric)
        _sync_active_diet_from_metric(db, user, metric, current_user.id)
    else:
        _sync_user_from_latest_body_metric(db, user)
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
        .order_by(_metric_effective_date_expr().asc(), BodyMetric.id.asc())
        .all()
    )


@router.post("/workout-sets", response_model=WorkoutSetOut)
def create_workout_set(
    payload: WorkoutSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = _target_user_id(payload.user_id, current_user, db)
    suggestion = _calculate_progression_suggestion(
        payload.exercise_name,
        payload.weight_kg,
        payload.reps,
        payload.rir,
        db,
        user_id,
        set_number=payload.set_number,
        target_min_reps=payload.target_min_reps,
        target_max_reps=payload.target_max_reps,
        target_sets=payload.target_sets,
        target_rir=payload.target_rir,
    )
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
