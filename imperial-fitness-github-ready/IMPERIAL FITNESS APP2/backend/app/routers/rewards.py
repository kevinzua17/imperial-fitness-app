from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import RewardEvent, RewardProduct, RewardRedemption, User
from app.schemas import RewardBalanceOut, RewardEventCreate, RewardEventOut, RewardProductCreate, RewardProductOut, RewardRedeemRequest


router = APIRouter(prefix="/rewards", tags=["rewards"])


def _balance(db: Session, user_id: int) -> int:
    earned = db.query(func.coalesce(func.sum(RewardEvent.points), 0)).filter(RewardEvent.user_id == user_id).scalar() or 0
    spent = db.query(func.coalesce(func.sum(RewardRedemption.cost), 0)).filter(RewardRedemption.user_id == user_id).scalar() or 0
    return int(earned - spent)


@router.get("/balance", response_model=RewardBalanceOut)
def get_balance(user_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_id = user_id if current_user.role == "admin" and user_id else current_user.id
    return {"user_id": target_id, "balance": _balance(db, target_id)}


@router.get("/events", response_model=list[RewardEventOut])
def list_events(user_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_id = user_id if current_user.role == "admin" and user_id else current_user.id
    return db.query(RewardEvent).filter(RewardEvent.user_id == target_id).order_by(RewardEvent.created_at.desc()).all()


@router.post("/events", response_model=RewardEventOut)
def create_event(payload: RewardEventCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    event = RewardEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/products", response_model=list[RewardProductOut])
def list_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RewardProduct).filter(RewardProduct.active == 1).order_by(RewardProduct.created_at.desc()).all()


@router.post("/products", response_model=RewardProductOut)
def create_product(payload: RewardProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    product = RewardProduct(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.post("/redeem")
def redeem(payload: RewardRedeemRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(RewardProduct).filter(RewardProduct.id == payload.product_id).with_for_update().first()
    if not product or product.active != 1:
        raise HTTPException(status_code=404, detail="Producto no disponible")
    if product.stock <= 0:
        raise HTTPException(status_code=400, detail="Producto sin stock")
    if _balance(db, current_user.id) < product.cost:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    redemption = RewardRedemption(user_id=current_user.id, product_id=product.id, cost=product.cost)
    product.stock -= 1
    db.add(redemption)
    db.commit()
    return {"ok": True, "redemption_id": redemption.id, "balance": _balance(db, current_user.id)}