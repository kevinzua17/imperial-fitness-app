from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


PUBLIC_PATH_PREFIXES = (
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/uploads",
    "/favicon.ico",
)


class StrictOriginMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origins: list[str]):
        super().__init__(app)
        self.allowed_origins = set(allowed_origins)

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path.startswith(PUBLIC_PATH_PREFIXES):
            return await call_next(request)

        origin = request.headers.get("origin")

        # Swagger UI and local tools can send the API origin itself as Origin.
        same_origin = f"{request.url.scheme}://{request.url.netloc}"
        effective_allowed_origins = self.allowed_origins | {same_origin}

        # Permite herramientas server-to-server, health checks y Swagger sin Origin.
        if origin and origin not in effective_allowed_origins:
            return JSONResponse(
                status_code=403,
                content={"detail": "Origen no permitido para esta API."},
            )
        return await call_next(request)