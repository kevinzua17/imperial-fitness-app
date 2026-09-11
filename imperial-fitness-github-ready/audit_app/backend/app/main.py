from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.database import init_db
from app.middleware.metrics import MetricsMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.strict_origin import StrictOriginMiddleware
from app.routers import auth, challenges, chat, community, finance, maintenance, media, nutrition, progress, retention, rewards, routines, specialist, stats, sync, users


settings = get_settings()
configure_logging()
upload_root = Path(settings.upload_dir)
upload_root.mkdir(parents=True, exist_ok=True)

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        environment=settings.app_env,
        release="imperial-fitness-api@1.9.0",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title=settings.app_name,
    version="1.9.0",
    description="API central para Imperial Fitness: usuarios, dietas, rutinas, progreso, chat y sincronización.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)
if settings.metrics_enabled:
    app.add_middleware(MetricsMiddleware)
app.add_middleware(StrictOriginMiddleware, allowed_origins=settings.cors_origin_list)
app.add_middleware(
    RateLimitMiddleware,
    limit_per_minute=settings.rate_limit_per_minute,
    enabled=settings.rate_limit_enabled,
)
if settings.app_env != "local":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)

app.mount("/uploads", StaticFiles(directory=str(upload_root)), name="uploads")

@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "environment": settings.app_env}


@app.get("/health/live")
def live():
    return {"status": "alive"}


@app.get("/health/ready")
def ready():
    return {"status": "ready", "database": "configured"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(nutrition.router)
app.include_router(routines.router)
app.include_router(progress.router)
app.include_router(sync.router)
app.include_router(specialist.router)
app.include_router(media.router)
app.include_router(community.router)
app.include_router(challenges.router)
app.include_router(maintenance.router)
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(rewards.router)
app.include_router(finance.router)
app.include_router(retention.router)