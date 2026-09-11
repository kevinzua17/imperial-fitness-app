from __future__ import annotations

import json
import logging
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.security import decode_access_token_subject

logger = logging.getLogger("imperial.audit")

SENSITIVE_PATHS = ("/auth/login", "/auth/refresh", "/auth/reset-password", "/auth/forgot-password")
AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        started_at = time.perf_counter()
        response = await call_next(request)

        if not settings.audit_log_enabled or request.method.upper() not in AUDITED_METHODS:
            return response

        actor_id = None
        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer ") and request.url.path not in SENSITIVE_PATHS:
            actor_id = decode_access_token_subject(authorization.removeprefix("Bearer ").strip())

        client_host = request.client.host if request.client else None
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_host = forwarded_for.split(",", 1)[0].strip()

        payload = {
            "event": "audit.http_mutation",
            "request_id": getattr(request.state, "request_id", None),
            "actor_id": actor_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
            "ip": client_host,
            "user_agent": request.headers.get("User-Agent", "")[:180],
        }
        logger.info(json.dumps(payload, ensure_ascii=False))
        return response
