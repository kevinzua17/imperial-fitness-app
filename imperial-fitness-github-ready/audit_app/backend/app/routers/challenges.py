from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin_or_trainer
from app.models import Challenge, ChallengeParticipant, User
from app.schemas import ChallengeCreate, ChallengeOut, ChallengeParticipantOut


router = APIRouter(prefix="/challenges", tags=["challenges"])


def _challenge_out(challenge: Challenge, db: Session) -> ChallengeOut:
    participants_count = db.query(ChallengeParticipant).filter(ChallengeParticipant.challenge_id == challenge.id).count()
    return ChallengeOut(
        id=challenge.id,
        title=challenge.title,
        description=challenge.description,
        status=challenge.status,
        participants_count=participants_count,
        starts_at=challenge.starts_at,
        ends_at=challenge.ends_at,
        created_at=challenge.created_at,
    )


@router.get("", response_model=list[ChallengeOut])
def list_challenges(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(Challenge).order_by(Challenge.created_at.desc()).all()
    return [_challenge_out(row, db) for row in rows]


@router.post("", response_model=ChallengeOut)
def create_challenge(
    payload: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    challenge = Challenge(**payload.model_dump())
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return _challenge_out(challenge, db)


@router.post("/{challenge_id}/join", response_model=ChallengeParticipantOut)
def join_challenge(challenge_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge or challenge.status != "active":
        raise HTTPException(status_code=404, detail="Reto no disponible")
    existing = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == current_user.id,
    ).first()
    if existing:
        return existing
    participant = ChallengeParticipant(challenge_id=challenge_id, user_id=current_user.id, progress_value=0)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.patch("/{challenge_id}/progress", response_model=ChallengeParticipantOut)
def update_challenge_progress(
    challenge_id: int,
    progress_value: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    participant = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == current_user.id,
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="No estás inscrito en este reto")
    participant.progress_value = progress_value
    db.commit()
    db.refresh(participant)
    return participant