from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.deps import get_current_user
from app.models import ChatMessage, Friendship, User
from app.schemas import ChatMessageCreate, ChatMessageOut
from app.security import decode_access_token_subject


router = APIRouter(prefix="/chat", tags=["chat"])


def _can_message(sender: User, receiver: User, db: Session) -> bool:
    if sender.role == "admin" or receiver.role == "admin":
        return True
    if sender.role == "trainer" and receiver.assigned_trainer_id == sender.id:
        return True
    if sender.role == "client" and sender.assigned_trainer_id == receiver.id:
        return True
    friendship = db.query(Friendship).filter(
        Friendship.status == "accepted",
        ((Friendship.requester_id == sender.id) & (Friendship.addressee_id == receiver.id))
        | ((Friendship.requester_id == receiver.id) & (Friendship.addressee_id == sender.id))
    ).first()
    if friendship:
        return True
    return sender.id == receiver.id


@router.get("/messages", response_model=list[ChatMessageOut])
def list_messages(with_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    other = db.get(User, with_user_id)
    if not other or not _can_message(current_user, other, db):
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == with_user_id))
        | ((ChatMessage.sender_id == with_user_id) & (ChatMessage.receiver_id == current_user.id))
    ).order_by(ChatMessage.created_at.asc()).all()


@router.get("/messages/{user_id}", response_model=list[ChatMessageOut])
def list_messages_by_path(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_messages(user_id, db, current_user)


@router.get("/conversations", response_model=list[dict])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        users = db.query(User).filter(User.id != current_user.id, User.status == "active").order_by(User.name.asc()).all()
    elif current_user.role == "trainer":
        users = db.query(User).filter(User.assigned_trainer_id == current_user.id, User.status == "active").order_by(User.name.asc()).all()
    else:
        users = []
        if current_user.assigned_trainer_id:
            trainer = db.get(User, current_user.assigned_trainer_id)
            if trainer and trainer.status == "active":
                users.append(trainer)
        friendships = db.query(Friendship).filter(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id),
        ).all()
        friend_ids = [item.addressee_id if item.requester_id == current_user.id else item.requester_id for item in friendships]
        if friend_ids:
            users.extend(db.query(User).filter(User.id.in_(friend_ids), User.status == "active").all())
    return [
        {"id": user.id, "name": user.name, "role": user.role, "avatar_url": user.avatar_url}
        for user in users
    ]


@router.post("/messages", response_model=ChatMessageOut)
def create_message(payload: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    receiver = db.get(User, payload.receiver_id)
    if not receiver or not _can_message(current_user, receiver, db):
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    message = ChatMessage(sender_id=current_user.id, receiver_id=receiver.id, text=payload.text)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket, token: str):
    await websocket.accept()
    db = SessionLocal()
    try:
        subject = decode_access_token_subject(token)
        if not subject:
            await websocket.close(code=1008)
            return
        user = db.get(User, int(subject))
        if not user or user.status != "active":
            await websocket.close(code=1008)
            return
        while True:
            await websocket.receive_text()
            await websocket.send_json({"type": "heartbeat", "user_id": user.id})
    except WebSocketDisconnect:
        return
    finally:
        db.close()