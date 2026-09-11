from app.core.config import get_settings


def enqueue_job(func, *args, **kwargs) -> bool:
    settings = get_settings()
    if not (settings.async_jobs_enabled and settings.redis_url):
        return False
    try:
        from redis import Redis
        from rq import Queue

        redis = Redis.from_url(settings.redis_url)
        queue = Queue(settings.rq_queue_name, connection=redis)
        queue.enqueue(func, *args, **kwargs)
        return True
    except Exception:
        return False
