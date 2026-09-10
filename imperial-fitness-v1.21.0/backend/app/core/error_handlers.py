from __future__ import annotations

import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse

logger = logging.getLogger("imperial.errors")


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Revisa los datos enviados e intenta nuevamente.",
            "request_id": _request_id(request),
        },
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("database_error", extra={"request_id": _request_id(request)})
    return JSONResponse(
        status_code=503,
        content={
            "detail": "La base de datos no está disponible temporalmente.",
            "request_id": _request_id(request),
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error", extra={"request_id": _request_id(request)})
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Ocurrió un error inesperado. Intenta nuevamente en unos minutos.",
            "request_id": _request_id(request),
        },
    )
