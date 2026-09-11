from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.deps import get_current_user
from app.models import ChatMessage, Friendship, User
from app.schemas import ChatMessageCreate, ChatMessageOut
from app.security import decode_access_token_subject
from app.core.time import utcnow


router = APIRouter(prefix="/chat", tags=["chat"])


def _can_message(sender: User, receiver: User, db: Session) -> bool:
    """Centraliza las reglas de permiso del chat."""
    if sender.role == "admin" or receiver.role == "admin":
        return True
    if sender.role == "trainer" and receiver.assigned_trainer_id == sender.id:
        return True
    if sender.role == "client" and sender.assigned_trainer_id == receiver.id:
        return True

    friendship = db.query(Friendship).filter(
        Friendship.status == "accepted",
        ((Friendship.requester_id == sender.id) & (Friendship.addressee_id == receiver.id))
        | ((Friendship.requester_id == receiver.id) & (Friendship.addressee_id == sender.id)),
    ).first()

    if friendship:
        return True

    return sender.id == receiver.id


def _conversation_user_ids(db: Session, current_user: User) -> list[int]:
    """Devuelve usuarios visibles para conversación.

    Antes el cliente solo veía entrenador/amigos. Si un admin escribía a un cliente,
    el cliente no veía al admin en su lista y parecía que el mensaje nunca llegaba.
    Ahora siempre se incluyen participantes con mensajes existentes y los admins activos.
    """
    user_ids: set[int] = set()

    # Participantes con historial real de mensajes.
    pairs = db.query(ChatMessage.sender_id, ChatMessage.receiver_id).filter(
        (ChatMessage.sender_id == current_user.id) | (ChatMessage.receiver_id == current_user.id)
    ).all()

    for sender_id, receiver_id in pairs:
        other_id = receiver_id if sender_id == current_user.id else sender_id
        if other_id != current_user.id:
            user_ids.add(other_id)

    # Admin puede hablar con todos.
    if current_user.role == "admin":
        rows = db.query(User.id).filter(User.id != current_user.id, User.status == "active").all()
        user_ids.update(row[0] for row in rows)

    # Entrenador ve sus clientes y admins.
    elif current_user.role == "trainer":
        rows = db.query(User.id).filter(
            User.status == "active",
            (User.assigned_trainer_id == current_user.id) | (User.role == "admin"),
            User.id != current_user.id,
        ).all()
        user_ids.update(row[0] for row in rows)

    # Cliente ve su entrenador, admins, amigos y cualquier usuario con historial real.
    else:
        if current_user.assigned_trainer_id:
            user_ids.add(current_user.assigned_trainer_id)

        admins = db.query(User.id).filter(User.role == "admin", User.status == "active", User.id != current_user.id).all()
        user_ids.update(row[0] for row in admins)

        friendships = db.query(Friendship).filter(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id),
        ).all()
        for item in friendships:
            friend_id = item.addressee_id if item.requester_id == current_user.id else item.requester_id
            if friend_id != current_user.id:
                user_ids.add(friend_id)

    return list(user_ids)


def _unread_count_for_user(db: Session, user_id: int) -> int:
    return db.query(ChatMessage).filter(
        ChatMessage.receiver_id == user_id,
        ChatMessage.read_at.is_(None),
    ).count()


@router.get("/messages", response_model=list[ChatMessageOut])
def list_messages(with_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    other = db.get(User, with_user_id)
    if not other or not _can_message(current_user, other, db):
        raise HTTPException(status_code=403, detail="Permiso insuficiente")

    rows = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == with_user_id))
        | ((ChatMessage.sender_id == with_user_id) & (ChatMessage.receiver_id == current_user.id))
    ).order_by(ChatMessage.created_at.asc()).all()

    # Marcar como leídos los mensajes entrantes cuando el usuario abre esa conversación.
    changed = False
    now = utcnow()
    for message in rows:
        if message.receiver_id == current_user.id and message.sender_id == with_user_id and message.read_at is None:
            message.read_at = now
            changed = True
    if changed:
        db.commit()

    return rows


@router.get("/messages/{user_id}", response_model=list[ChatMessageOut])
def list_messages_by_path(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_messages(user_id, db, current_user)


@router.get("/unread-count")
def unread_chat_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"count": _unread_count_for_user(db, current_user.id)}


@router.get("/conversations", response_model=list[dict])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_ids = _conversation_user_ids(db, current_user)
    if not user_ids:
        return []

    users = db.query(User).filter(User.id.in_(user_ids), User.status == "active").all()

    unread_by_sender: dict[int, int] = {}
    unread_rows = db.query(ChatMessage.sender_id).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.read_at.is_(None),
    ).all()
    for (sender_id,) in unread_rows:
        unread_by_sender[sender_id] = unread_by_sender.get(sender_id, 0) + 1

    allowed_users = [user for user in users if _can_message(current_user, user, db)]
    allowed_users.sort(key=lambda user: (-unread_by_sender.get(user.id, 0), user.name.lower()))

    return [
        {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "unread_count": unread_by_sender.get(user.id, 0),
        }
        for user in allowed_users
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
