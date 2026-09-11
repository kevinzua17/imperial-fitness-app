from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import AttendanceLog, RetentionAlert, User
from app.schemas import AttendanceCreate, AttendanceOut, RetentionAlertOut


router = APIRouter(prefix="/retention", tags=["retention"])


def _assert_can_manage_user(target_user_id: int, current_user: User, db: Session) -> None:
    if current_user.role == "admin":
        return
    if current_user.role == "trainer":
        client = db.get(User, target_user_id)
        if client and client.assigned_trainer_id == current_user.id:
            return
    if current_user.id == target_user_id:
        return
    from fastapi import HTTPException
    raise HTTPException(status_code=403, detail="Permiso insuficiente")


@router.post("/attendance", response_model=AttendanceOut)
def register_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = payload.user_id if current_user.role in {"admin", "trainer"} and payload.user_id else current_user.id
    _assert_can_manage_user(user_id, current_user, db)
    log = AttendanceLog(user_id=user_id, source=payload.source)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/attendance", response_model=list[AttendanceOut])
def list_attendance(user_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_id = user_id if current_user.role in {"admin", "trainer"} and user_id else current_user.id
    _assert_can_manage_user(target_id, current_user, db)
    return db.query(AttendanceLog).filter(AttendanceLog.user_id == target_id).order_by(AttendanceLog.checked_at.desc()).limit(100).all()


def _build_alert_for_user(user: User, db: Session) -> RetentionAlert | None:
    last = db.query(AttendanceLog).filter(AttendanceLog.user_id == user.id).order_by(AttendanceLog.checked_at.desc()).first()
    if not last:
        return RetentionAlert(user_id=user.id, risk="medium", reason="No hay asistencias registradas.", suggested_action="Contactar al cliente y programar primera asistencia.")
    days = (datetime.utcnow() - last.checked_at).days
    if days >= 7:
        return RetentionAlert(user_id=user.id, risk="high", reason=f"{days} días sin registrar asistencia.", suggested_action="Contactar por WhatsApp y ofrecer valoración de retorno.")
    if days >= 4:
        return RetentionAlert(user_id=user.id, risk="medium", reason=f"{days} días sin registrar asistencia.", suggested_action="Enviar recordatorio cordial y revisar agenda semanal.")
    return None


@router.post("/generate-alerts", response_model=list[RetentionAlertOut])
def generate_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    query = db.query(User).filter(User.role == "client", User.status == "active")
    if current_user.role == "trainer":
        query = query.filter(User.assigned_trainer_id == current_user.id)
    created = []
    for user in query.all():
        alert = _build_alert_for_user(user, db)
        if not alert:
            continue
        exists = db.query(RetentionAlert).filter(RetentionAlert.user_id == user.id, RetentionAlert.status == "open", RetentionAlert.reason == alert.reason).first()
        if not exists:
            db.add(alert)
            db.commit()
            db.refresh(alert)
            created.append(alert)
    return [_out(alert, db) for alert in created]


@router.get("/alerts", response_model=list[RetentionAlertOut])
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    query = db.query(RetentionAlert).filter(RetentionAlert.status == "open").order_by(RetentionAlert.created_at.desc())
    if current_user.role == "trainer":
        assigned_ids = [row.id for row in db.query(User.id).filter(User.assigned_trainer_id == current_user.id).all()]
        query = query.filter(RetentionAlert.user_id.in_(assigned_ids))
    return [_out(alert, db) for alert in query.all()]


@router.post("/alerts/{alert_id}/resolve", response_model=RetentionAlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_trainer)):
    alert = db.get(RetentionAlert, alert_id)
    if not alert:
        from fastapi import HTTPException
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