from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import BodyMetric, Challenge, ChallengeParticipant, CommunityPost, PostComment, PostReaction, ProgressPhoto, SyncEvent, User, WorkoutSetLog


router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.post("/cleanup-demo")
def cleanup_demo_data(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    for model in [PostComment, PostReaction, CommunityPost, ChallengeParticipant, Challenge, BodyMetric, WorkoutSetLog, ProgressPhoto, SyncEvent]:
        db.query(model).delete()
    db.commit()
    return {"ok": True, "detail": "Datos demo limpiados. Usuarios, roles, alimentos, rutinas y configuración se conservaron."}