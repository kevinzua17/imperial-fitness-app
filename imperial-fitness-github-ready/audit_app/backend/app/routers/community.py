from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.uploads import save_image_upload
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import CommunityPost, Friendship, PostComment, PostReaction, User
from app.schemas import CommunityCommentCreate, CommunityPostOut, FriendshipCreate, FriendshipOut, UserOut


router = APIRouter(prefix="/community", tags=["community"])


@router.get("/discover-users", response_model=list[UserOut])
def discover_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).filter(
        User.role == "client",
        User.status == "active",
        User.id != current_user.id,
    ).order_by(User.name.asc()).all()


def _split_tags(tags: str) -> list[str]:
    return [tag.strip().lstrip("#").lower() for tag in tags.split(",") if tag.strip()]


def _post_out(post: CommunityPost, db: Session) -> CommunityPostOut:
    author = db.get(User, post.author_id)
    likes = db.query(PostReaction).filter(PostReaction.post_id == post.id).count()
    comments = db.query(PostComment).filter(PostComment.post_id == post.id).count()
    return CommunityPostOut(
        id=post.id,
        author_id=post.author_id,
        author_name=author.name if author else "Usuario",
        author_avatar_url=author.avatar_url if author else None,
        content=post.content,
        image_url=post.image_url,
        tags=_split_tags(post.tags),
        likes_count=likes,
        comments_count=comments,
        created_at=post.created_at,
    )


@router.get("/posts", response_model=list[CommunityPostOut])
def list_posts(
    tag: str | None = None,
    only_friends: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CommunityPost).order_by(CommunityPost.created_at.desc())
    if tag:
        query = query.filter(CommunityPost.tags.ilike(f"%{tag.strip().lstrip('#').lower()}%"))
    if only_friends and current_user.role == "client":
        friend_ids_query = db.query(Friendship.requester_id, Friendship.addressee_id).filter(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id),
        )
        friend_ids = set()
        for requester_id, addressee_id in friend_ids_query.all():
            friend_ids.add(addressee_id if requester_id == current_user.id else requester_id)
        friend_ids.add(current_user.id)
        query = query.filter(CommunityPost.author_id.in_(friend_ids))
    return [_post_out(post, db) for post in query.limit(100).all()]


@router.post("/posts", response_model=CommunityPostOut)
async def create_post(
    content: str = Form(""),
    tags: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_url = await save_image_upload(file, "community") if file else None
    post = CommunityPost(author_id=current_user.id, content=content, tags=",".join(_split_tags(tags)), image_url=image_url)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_out(post, db)


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    if current_user.role != "admin" and post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    db.delete(post)
    db.commit()
    return {"ok": True}


@router.post("/posts/{post_id}/comments")
def add_comment(post_id: int, payload: CommunityCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.get(CommunityPost, post_id):
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    comment = PostComment(post_id=post_id, author_id=current_user.id, text=payload.text)
    db.add(comment)
    db.commit()
    return {"ok": True, "comment_id": comment.id}


@router.get("/posts/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comments = db.query(PostComment).filter(PostComment.post_id == post_id).order_by(PostComment.created_at.asc()).all()
    return [
        {
            "id": comment.id,
            "post_id": comment.post_id,
            "author_id": comment.author_id,
            "author_name": (db.get(User, comment.author_id).name if db.get(User, comment.author_id) else "Usuario"),
            "text": comment.text,
            "created_at": comment.created_at,
        }
        for comment in comments
    ]


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.get(PostComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    if current_user.role != "admin" and comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    db.delete(comment)
    db.commit()
    return {"ok": True}


@router.post("/posts/{post_id}/react")
def react_to_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.get(CommunityPost, post_id):
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    existing = db.query(PostReaction).filter(PostReaction.post_id == post_id, PostReaction.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    reaction = PostReaction(post_id=post_id, user_id=current_user.id)
    db.add(reaction)
    db.commit()
    return {"liked": True}


@router.post("/friends/request", response_model=FriendshipOut)
def request_friendship(payload: FriendshipCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.addressee_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes enviarte solicitud a ti mismo")
    existing = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == payload.addressee_id))
        | ((Friendship.requester_id == payload.addressee_id) & (Friendship.addressee_id == current_user.id))
    ).first()
    if existing:
        return existing
    friendship = Friendship(requester_id=current_user.id, addressee_id=payload.addressee_id, status="pending")
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


@router.post("/friends/{friendship_id}/accept", response_model=FriendshipOut)
def accept_friendship(friendship_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.get(Friendship, friendship_id)
    if not friendship or friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)
    return friendship


@router.post("/friends/{friendship_id}/reject", response_model=FriendshipOut)
def reject_friendship(friendship_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.get(Friendship, friendship_id)
    if not friendship or friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    friendship.status = "rejected"
    db.commit()
    db.refresh(friendship)
    return friendship


@router.delete("/friends/{friendship_id}")
def delete_friendship(friendship_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = db.get(Friendship, friendship_id)
    if not friendship or current_user.id not in {friendship.requester_id, friendship.addressee_id}:
        raise HTTPException(status_code=404, detail="Amistad no encontrada")
    db.delete(friendship)
    db.commit()
    return {"ok": True}


@router.get("/friends", response_model=list[FriendshipOut])
def list_friendships(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Friendship).filter(
        Friendship.status == "accepted",
        (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id),
    ).order_by(Friendship.updated_at.desc()).all()


@router.get("/friends/requests", response_model=list[FriendshipOut])
def list_friendship_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Friendship).filter(
        Friendship.status == "pending",
        Friendship.addressee_id == current_user.id,
    ).order_by(Friendship.created_at.desc()).all()


@router.get("/friends/sent", response_model=list[FriendshipOut])
def list_sent_friendship_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Friendship).filter(
        Friendship.status == "pending",
        Friendship.requester_id == current_user.id,
    ).order_by(Friendship.created_at.desc()).all()


@router.get("/tags")
def list_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(CommunityPost.tags).all()
    tags = sorted({tag for (raw_tags,) in rows for tag in _split_tags(raw_tags or "")})
    return {"tags": tags}