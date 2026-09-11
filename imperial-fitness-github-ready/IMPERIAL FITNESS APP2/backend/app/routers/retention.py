from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import AttendanceLog, RetentionAlert, User
from app.schemas import AttendanceCreate, AttendanceOut, RetentionAlertOut


router = APIRouter(prefix="/retention", tags=["retention"])
REQUIRED_RETENTION_TABLES = ("attendance_logs", "retention_alerts")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _missing_retention_tables(db: Session) -> list[str]:
    """Return missing retention tables without failing the dashboard."""
    try:
        bind = db.get_bind()
        dialect = bind.dialect.name
        if dialect == "sqlite":
            tables = set(inspect(bind).get_table_names())
            return [table for table in REQUIRED_RETENTION_TABLES if table not in tables]

        rows = db.execute(
            text(
                """
                select table_name
                from information_schema.tables
                where table_schema = 'public'
                and table_name in ('attendance_logs', 'retention_alerts')
                """
            )
        ).scalars().all()
        existing = set(rows)
        return [table for table in REQUIRED_RETENTION_TABLES if table not in existing]
    except SQLAlchemyError:
        # If the check itself cannot run, let the caller treat the module as not ready.
        return list(REQUIRED_RETENTION_TABLES)


def _retention_ready(db: Session) -> bool:
    return not _missing_retention_tables(db)


def _assert_can_manage_user(target_user_id: int, current_user: User, db: Session) -> None:
    if current_user.role == "admin":
        return
    if current_user.role == "trainer":
        client = db.get(User, target_user_id)
        if client and client.assigned_trainer_id == current_user.id:
            return
    if current_user.id == target_user_id:
        return
    raise HTTPException(status_code=403, detail="Permiso insuficiente")


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    missing = _missing_retention_tables(db)
    return {
        "ready": len(missing) == 0,
        "missing_tables": missing,
        "checked_at": _utcnow().isoformat(),
    }


@router.post("/attendance", response_model=AttendanceOut)
def register_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _retention_ready(db):
        raise HTTPException(status_code=503, detail="Módulo de asistencia pendiente de migración en Supabase.")

    user_id = payload.user_id if current_user.role in {"admin", "trainer"} and payload.user_id else current_user.id
    _assert_can_manage_user(user_id, current_user, db)
    log = AttendanceLog(user_id=user_id, source=payload.source)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/attendance", response_model=list[AttendanceOut])
def list_attendance(user_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not _retention_ready(db):
        return []

    target_id = user_id if current_user.role in {"admin", "trainer"} and user_id else current_user.id
    _assert_can_manage_user(target_id, current_user, db)
    return db.query(AttendanceLog).filter(AttendanceLog.user_id == target_id).order_by(AttendanceLog.checked_at.desc()).limit(100).all()


def _build_alert_for_user(user: User, db: Session) -> RetentionAlert | None:
    last = db.query(AttendanceLog).filter(AttendanceLog.user_id == user.id).order_by(AttendanceLog.checked_at.desc()).first()
    if not last:
        return RetentionAlert(
            user_id=user.id,
            risk="medium",
            reason="No hay asistencias registradas.",
            suggested_action="Contactar al cliente y programar primera asistencia.",
        )

    days = (_utcnow() - _as_aware_utc(last.checked_at)).days
    if days >= 7:
        return RetentionAlert(
            user_id=user.id,
            risk="high",
            reason=f"{days} días sin registrar asistencia.",
            suggested_action="Contactar por WhatsApp y ofrecer valoración de retorno.",
        )
    if days >= 4:
        return RetentionAlert(
            user_id=user.id,
            risk="medium",
            reason=f"{days} días sin registrar asistencia.",
            suggested_action="Enviar recordatorio cordial y revisar agenda semanal.",
        )
    return None


@router.post("/generate-alerts", response_model=list[RetentionAlertOut])
def generate_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    if not _retention_ready(db):
        raise HTTPException(status_code=503, detail="Módulo de seguimiento pendiente de migración en Supabase.")

    try:
        query = db.query(User).filter(User.role == "client", User.status == "active")
        if current_user.role == "trainer":
            query = query.filter(User.assigned_trainer_id == current_user.id)
        created = []
        for user in query.all():
            alert = _build_alert_for_user(user, db)
            if not alert:
                continue
            exists = (
                db.query(RetentionAlert)
                .filter(
                    RetentionAlert.user_id == user.id,
                    RetentionAlert.status == "open",
                    RetentionAlert.reason == alert.reason,
                )
                .first()
            )
            if not exists:
                db.add(alert)
                db.commit()
                db.refresh(alert)
                created.append(alert)
        return [_out(alert, db) for alert in created]
    except (ProgrammingError, OperationalError) as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Módulo de seguimiento pendiente de migración en Supabase.") from exc


@router.get("/alerts", response_model=list[RetentionAlertOut])
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    if not _retention_ready(db):
        return []

    try:
        query = db.query(RetentionAlert).filter(RetentionAlert.status == "open").order_by(RetentionAlert.created_at.desc())
        if current_user.role == "trainer":
            assigned_ids = [row.id for row in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
            if not assigned_ids:
                return []
            query = query.filter(RetentionAlert.user_id.in_(assigned_ids))
        return [_out(alert, db) for alert in query.all()]
    except (ProgrammingError, OperationalError) as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Módulo de seguimiento pendiente de migración en Supabase.") from exc


@router.post("/alerts/{alert_id}/resolve", response_model=RetentionAlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    if not _retention_ready(db):
        raise HTTPException(status_code=503, detail="Módulo de seguimiento pendiente de migración en Supabase.")

    alert = db.get(RetentionAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    _assert_can_manage_user(alert.user_id, current_user, db)
    alert.status = "resolved"
    db.commit()
    db.refresh(alert)
    return _out(alert, db)


def _out(alert: RetentionAlert, db: Session) -> RetentionAlertOut:
    user = db.get(User, alert.user_id)
    return RetentionAlertOut(
        id=alert.id,
        user_id=alert.user_id,
        client_name=user.name if user else "Cliente",
        risk=alert.risk,
        reason=alert.reason,
        suggested_action=alert.suggested_action,
        status=alert.status,
        created_at=alert.created_at,
    )
