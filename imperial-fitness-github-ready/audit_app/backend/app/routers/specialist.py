from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin_or_trainer
from app.models import User
from app.schemas import SpecialistSuggestionRequest, SpecialistSuggestionResponse
from app.services.specialist_ai import generate_specialist_suggestion


router = APIRouter(prefix="/specialist", tags=["specialist"])


@router.post("/suggestions", response_model=SpecialistSuggestionResponse)
def create_specialist_suggestion(
    payload: SpecialistSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_trainer),
):
    if payload.client_id and current_user.role == "trainer":
        client = db.get(User, payload.client_id)
        if not client or client.assigned_trainer_id != current_user.id:
            from fastapi import HTTPException

            raise HTTPException(status_code=403, detail="Solo puedes solicitar sugerencias de clientes asignados")
    return generate_specialist_suggestion(payload)