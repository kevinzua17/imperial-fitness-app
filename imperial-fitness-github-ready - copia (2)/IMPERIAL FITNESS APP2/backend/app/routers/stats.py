from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.cache import cache
from app.deps import get_current_user
from app.models import BodyMetric, Challenge, ChallengeParticipant, CommunityPost, DietPlan, PostComment, PostReaction, ProgressPhoto, User, WorkoutSetLog


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cache_key = f"stats:summary:{current_user.role}:{current_user.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    users_query = db.query(User)
    if current_user.role == "trainer":
        users_query = users_query.filter((User.assigned_trainer_id == current_user.id) | (User.id == current_user.id))
    elif current_user.role == "client":
        users_query = users_query.filter(User.id == current_user.id)

    users = users_query.all()
    user_ids = [user.id for user in users]
    client_ids = [user.id for user in users if user.role == "client"]

    diet_query = db.query(DietPlan)
    photo_query = db.query(ProgressPhoto)
    metric_query = db.query(BodyMetric)
    workout_query = db.query(WorkoutSetLog)
    post_query = db.query(CommunityPost)

    if current_user.role == "client":
        diet_query = diet_query.filter(DietPlan.client_id == current_user.id)
        photo_query = photo_query.filter(ProgressPhoto.client_id == current_user.id)
        metric_query = metric_query.filter(BodyMetric.user_id == current_user.id)
        workout_query = workout_query.filter(WorkoutSetLog.user_id == current_user.id)
        post_query = post_query.filter(CommunityPost.author_id == current_user.id)
    elif current_user.role == "trainer":
        diet_query = diet_query.filter(DietPlan.client_id.in_(client_ids))
        photo_query = photo_query.filter(ProgressPhoto.client_id.in_(client_ids))
        metric_query = metric_query.filter(BodyMetric.user_id.in_(client_ids))
        workout_query = workout_query.filter(WorkoutSetLog.user_id.in_(client_ids))
        post_query = post_query.filter(CommunityPost.author_id.in_(user_ids))

    latest_metric = metric_query.order_by(func.coalesce(BodyMetric.measured_at, BodyMetric.created_at).desc(), BodyMetric.id.desc()).first()

    active_challenges = db.query(Challenge).filter(Challenge.status == "active").count()
    challenge_participants = db.query(ChallengeParticipant).count()

    result = {
        "users_total": len(users),
        "clients_total": len([u for u in users if u.role == "client"]),
        "trainers_total": len([u for u in users if u.role == "trainer"]),
        "admins_total": len([u for u in users if u.role == "admin"]),
        "pending_users": len([u for u in users if u.status == "pending"]),
        "active_users": len([u for u in users if u.status == "active"]),
        "diet_plans_total": diet_query.count(),
        "progress_photos_total": photo_query.count(),
        "body_metrics_total": metric_query.count(),
        "workout_sets_total": workout_query.count(),
        "community_posts_total": post_query.count(),
        "comments_total": db.query(PostComment).count() if current_user.role == "admin" else 0,
        "reactions_total": db.query(PostReaction).count() if current_user.role == "admin" else 0,
        "active_challenges": active_challenges,
        "challenge_participants_total": challenge_participants,
        "latest_weight": latest_metric.weight if latest_metric else None,
        "latest_body_fat": latest_metric.body_fat if latest_metric else None,
        "latest_muscle_mass": latest_metric.muscle_mass if latest_metric else None,
    }
    cache.set(cache_key, result, ttl=60)
    return result