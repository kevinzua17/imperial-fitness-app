from contextlib import asynccontextmanager
import os
import secrets

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.exceptions import RequestValidationError
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse, Response
from app.core.cache import cache
from app.core.config import get_settings
from app.core.error_handlers import database_exception_handler, unhandled_exception_handler, validation_exception_handler
from app.core.logging_config import configure_logging
from app.database import SessionLocal, init_db
from app.middleware.audit import AuditLogMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.strict_origin import StrictOriginMiddleware
from app.middleware.membership_access import MembershipAccessMiddleware
from app.routers import auth, challenges, chat, checkins, community, exercises, finance, gamification, history, limitations, maintenance, media, memberships, nutrition, progress, recovery, retention, rewards, routines, specialist, stats, sync, users, lite, professional


settings = get_settings()
APP_VERSION = "1.21.0"
BUILD_COMMIT = (os.getenv("RENDER_GIT_COMMIT") or os.getenv("SOURCE_VERSION") or "unknown")[:12]
configure_logging()
upload_root = Path(settings.upload_dir)
private_upload_root = Path(settings.private_upload_dir)
upload_root.mkdir(parents=True, exist_ok=True)
private_upload_root.mkdir(parents=True, exist_ok=True)

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        environment=settings.app_env,
        release=f"imperial-fitness-api@{APP_VERSION}",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

docs_enabled = settings.app_env != "production"
app = FastAPI(
    title=settings.app_name,
    version=APP_VERSION,
    description="API central para Imperial Fitness: usuarios, dietas, rutinas, progreso, chat y sincronización.",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(AuditLogMiddleware)
if settings.metrics_enabled:
    app.add_middleware(MetricsMiddleware)
app.add_middleware(StrictOriginMiddleware, allowed_origins=settings.cors_origin_list)
app.add_middleware(
    RateLimitMiddleware,
    limit_per_minute=settings.rate_limit_per_minute,
    enabled=settings.rate_limit_enabled,
)
app.add_middleware(MembershipAccessMiddleware)
if settings.app_env != "local":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)

app.mount("/uploads", StaticFiles(directory=str(upload_root)), name="uploads")

@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "environment": settings.app_env, "version": APP_VERSION, "build_commit": BUILD_COMMIT}


@app.get("/health/live")
def live():
    return {"status": "alive", "version": APP_VERSION, "build_commit": BUILD_COMMIT}




@app.get("/health/capabilities")
def capabilities():
    cloudinary_ready = bool(settings.cloudinary_url or (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret))
    smtp_ready = bool(settings.smtp_host and settings.smtp_username and settings.smtp_password and settings.smtp_from_email)
    return {
        "status": "ok",
        "version": APP_VERSION,
        "environment": settings.app_env,
        "core": {"database_configured": bool(settings.database_url), "auth_secret_configured": bool(settings.secret_key)},
        "optional": {
            "redis": bool(settings.redis_url),
            "smtp": smtp_ready,
            "cloudinary": cloudinary_ready if settings.storage_mode == "cloudinary" else settings.storage_mode != "local" or settings.app_env != "production",
            "sentry": bool(settings.sentry_dsn),
            "uptime_token": bool(settings.uptime_check_token),
        },
        "note": "Las capacidades opcionales degradadas no bloquean el inicio de sesión ni el arranque de la API.",
    }


@app.get("/health/ready")
def ready():
    routine_guard = None
    access_membership_dates_ready = None
    admin_access_ready = None
    nutrition_v2_ready = None
    body_metrics_history_ready = None
    exercise_library_v2_ready = None
    rls_sensitive_tables_ready = None
    imperial_lite_ready = None
    redis_ready = None if not settings.redis_url else False
    if settings.redis_url and cache.redis is not None:
        try:
            redis_ready = bool(cache.redis.ping())
        except Exception:
            redis_ready = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            if db.bind is not None and db.bind.dialect.name == "postgresql":
                routine_guard = bool(
                    db.execute(
                        text(
                            """
                            select 1
                            from pg_indexes
                            where schemaname = 'public'
                              and tablename = 'assigned_routines'
                              and indexname = 'uq_assigned_routines_one_active_per_client'
                            """
                        )
                    ).first()
                )
                access_membership_dates_ready = bool(
                    db.execute(
                        text(
                            """
                            select
                              (
                                select count(*) = 11
                                from information_schema.columns
                                where table_schema = 'public'
                                  and (
                                    (table_name = 'users' and column_name in (
                                      'pending_at', 'activated_at', 'suspended_at',
                                      'status_changed_at', 'access_note'
                                    ))
                                    or
                                    (table_name = 'membership_accounts' and column_name in (
                                      'activated_at', 'pending_validation_at', 'status_changed_at',
                                      'manual_status', 'manual_status_until', 'status_note'
                                    ))
                                  )
                              )
                              and
                              (
                                select count(distinct trigger_name) = 2
                                from information_schema.triggers
                                where event_object_schema = 'public'
                                  and trigger_name in (
                                    'trg_sync_user_access_status_dates',
                                    'trg_sync_membership_status_dates'
                                  )
                              )
                            """
                        )
                    ).scalar()
                )
                admin_access_ready = bool(
                    db.execute(
                        text(
                            """
                            select 1
                            from public.users
                            where lower(role) = 'admin'
                              and status = 'active'
                              and (locked_until is null or locked_until <= now())
                            limit 1
                            """
                        )
                    ).first()
                )
                nutrition_v2_ready = bool(
                    db.execute(
                        text(
                            """
                            select
                              (select count(*) = 4 from information_schema.columns
                               where table_schema = 'public' and table_name = 'users'
                                 and column_name in ('activity_level','workouts_per_week','average_daily_steps','occupation_activity'))
                              and
                              (select count(*) = 1 from information_schema.columns
                               where table_schema = 'public' and table_name = 'body_metrics' and column_name = 'bmr_source')
                              and
                              (select count(*) = 7 from information_schema.columns
                               where table_schema = 'public' and table_name = 'diet_plans'
                                 and column_name in ('status','version','calculation_json','based_on_metric_id','approved_by','published_at','supersedes_plan_id'))
                            """
                        )
                    ).scalar()
                )
                body_metrics_history_ready = bool(
                    db.execute(
                        text(
                            """
                            select count(*) = 3
                            from information_schema.columns
                            where table_schema = 'public'
                              and table_name = 'body_metrics'
                              and column_name in ('measured_at','recorded_at','bmr_source')
                            """
                        )
                    ).scalar()
                )
                exercise_library_v2_ready = bool(
                    db.execute(
                        text(
                            """
                            select count(*) = 4
                            from information_schema.columns
                            where table_schema = 'public' and table_name = 'exercises'
                              and column_name in ('is_visible','is_routine_eligible','review_status','source')
                            """
                        )
                    ).scalar()
                )
                rls_sensitive_tables_ready = bool(
                    db.execute(
                        text(
                            """
                            select count(*) = 5
                            from pg_class c
                            join pg_namespace n on n.oid = c.relnamespace
                            where n.nspname = 'public'
                              and c.relname in ('users','diet_plans','body_metrics','progress_photos','assigned_routines')
                              and c.relrowsecurity = true
                            """
                        )
                    ).scalar()
                )
                imperial_lite_ready = bool(
                    db.execute(
                        text(
                            """
                            select
                              (select count(*) = 2 from information_schema.columns
                               where table_schema = 'public' and table_name = 'users'
                                 and column_name in ('service_tier','experience_mode'))
                              and
                              (select count(*) = 5 from information_schema.tables
                               where table_schema = 'public' and table_name in
                                 ('client_portal_links','lite_sessions','wellness_checkins','plan_publications','client_intake_surveys'))
                            """
                        )
                    ).scalar()
                )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="La base de datos no está disponible.") from exc
    readiness_flags = (
        routine_guard,
        access_membership_dates_ready,
        admin_access_ready,
        nutrition_v2_ready,
        body_metrics_history_ready,
        exercise_library_v2_ready,
        rls_sensitive_tables_ready,
        imperial_lite_ready,
        redis_ready,
    )
    payload = {
        "status": "ready" if all(flag is not False for flag in readiness_flags) else "degraded",
        "database": "connected",
        "routine_single_active_guard": routine_guard,
        "access_membership_dates_ready": access_membership_dates_ready,
        "admin_access_ready": admin_access_ready,
        "nutrition_v2_ready": nutrition_v2_ready,
        "body_metrics_history_ready": body_metrics_history_ready,
        "exercise_library_v2_ready": exercise_library_v2_ready,
        "rls_sensitive_tables_ready": rls_sensitive_tables_ready,
        "imperial_lite_ready": imperial_lite_ready,
        "redis_ready": redis_ready,
        "version": APP_VERSION,
    }
    if payload["status"] != "ready":
        return JSONResponse(status_code=503, content=payload)
    return payload


@app.get("/metrics")
def metrics(request: Request):
    if not settings.metrics_enabled:
        raise HTTPException(status_code=404, detail="Métricas deshabilitadas.")

    if settings.app_env == "production":
        authorization = request.headers.get("Authorization", "")
        supplied_token = request.headers.get("X-Metrics-Token", "")
        if authorization.startswith("Bearer "):
            supplied_token = authorization.removeprefix("Bearer ").strip()
        expected_token = settings.uptime_check_token or ""
        if not supplied_token or not expected_token or not secrets.compare_digest(supplied_token, expected_token):
            raise HTTPException(status_code=403, detail="Token de métricas inválido.")

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(nutrition.router)
app.include_router(routines.router)
app.include_router(progress.router)
app.include_router(sync.router)
app.include_router(specialist.router)
app.include_router(media.router)
app.include_router(exercises.router)
app.include_router(limitations.router)
app.include_router(community.router)
app.include_router(challenges.router)
app.include_router(checkins.router)
app.include_router(gamification.router)
app.include_router(history.router)
app.include_router(memberships.router)
app.include_router(recovery.router)
app.include_router(maintenance.router)
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(rewards.router)
app.include_router(finance.router)
app.include_router(retention.router)
app.include_router(lite.router)
app.include_router(professional.router)