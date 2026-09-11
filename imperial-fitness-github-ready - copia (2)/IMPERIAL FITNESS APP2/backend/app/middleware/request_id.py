from __future__ import annotations

from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        header_name = settings.request_id_header
        request_id = request.headers.get(header_name) or uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[header_name] = request_id
        return response
