from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import Request
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings
from app.security import decode_access_token_subject


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit_per_minute: int = 90, enabled: bool = True):
        super().__init__(app)
        self.limit_per_minute = limit_per_minute
        self.enabled = enabled
        self.buckets: dict[str, Deque[float]] = defaultdict(deque)
        self.settings = get_settings()
        self.redis = None
        if self.settings.redis_url:
            try:
                from redis import Redis

                self.redis = Redis.from_url(
                    self.settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                    health_check_interval=30,
                    retry_on_timeout=False,
                )
            except Exception:
                self.redis = None

    async def dispatch(self, request: Request, call_next):
        if not self.enabled or request.url.path.startswith("/health") or request.url.path in {"/docs", "/openapi.json", "/redoc"}:
            return await call_next(request)

        key = self._key_for_request(request)
        if self.redis:
            try:
                allowed, retry_after = self._check_redis_limit(key)
                if not allowed:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Demasiadas peticiones. Intenta nuevamente en unos segundos."},
                        headers={"Retry-After": str(retry_after)},
                    )
                return await call_next(request)
            except Exception:
                # Availability fallback only. Readiness will remain degraded and
                # the process should be restarted after Redis recovers.
                self.redis = None

        now = time.time()
        bucket = self.buckets[key]

        while bucket and now - bucket[0] > 60:
            bucket.popleft()

        if len(bucket) >= self.limit_per_minute:
            retry_after = max(1, int(60 - (now - bucket[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas peticiones. Intenta nuevamente en unos segundos."},
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
        return await call_next(request)

    def _check_redis_limit(self, key: str) -> tuple[bool, int]:
        redis_key = f"rate:{key}:{int(time.time() // 60)}"
        count = int(self.redis.incr(redis_key))
        if count == 1:
            self.redis.expire(redis_key, 70)
        if count > self.limit_per_minute:
            ttl = self.redis.ttl(redis_key)
            return False, max(1, ttl)
        return True, 0

    def _key_for_request(self, request: Request) -> str:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                subject = decode_access_token_subject(token)
                if subject:
                    return f"user:{subject}"
            except JWTError:
                pass

        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"


def make_rate_limit_middleware(app):
    settings = get_settings()
    return RateLimitMiddleware(
        app,
        limit_per_minute=settings.rate_limit_per_minute,
        enabled=settings.rate_limit_enabled,
    )