from redis import Redis
from rq import Worker, Queue

from app.core.config import get_settings


def main():
    settings = get_settings()
    if not settings.redis_url:
        raise RuntimeError("REDIS_URL requerido para worker RQ")
    redis = Redis.from_url(settings.redis_url)
    worker = Worker([Queue(settings.rq_queue_name, connection=redis)], connection=redis)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()