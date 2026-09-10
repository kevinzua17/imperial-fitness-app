from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings


settings = get_settings()

database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

is_sqlite = database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
if not is_sqlite and settings.db_disable_prepared_statements:
    # Evita `psycopg.errors.DuplicatePreparedStatement` en Render/Supabase pooler.
    # psycopg3 prepara consultas automáticamente; prepare_threshold=None lo desactiva.
    connect_args["prepare_threshold"] = None

engine_kwargs = {"connect_args": connect_args, "pool_pre_ping": True}
if not is_sqlite:
    engine_kwargs.update(
        {
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_recycle": settings.db_pool_recycle_seconds,
        }
    )
engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    # Regla segura: solo SQLite puede auto-crear estructura por defecto.
    # PostgreSQL/Supabase no debe ejecutar metadata.create_all() al arrancar;
    # si se requiere para un ambiente temporal debe activarse explícitamente con
    # DB_AUTO_CREATE=true. Esto evita fallos de startup y protege Supabase.
    if not settings.db_auto_create and not is_sqlite:
        return

    if settings.db_auto_create or is_sqlite:
        Base.metadata.create_all(bind=engine)

    if is_sqlite:
        _ensure_sqlite_user_columns()
        _ensure_sqlite_diet_columns()
        _ensure_sqlite_exercise_columns()
        _ensure_sqlite_body_metric_columns()
        _ensure_sqlite_sync_event_columns()
        _ensure_sqlite_community_columns()


def _ensure_sqlite_user_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []
    if "status" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN status VARCHAR(30) DEFAULT 'pending'")
    if "auth_user_id" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN auth_user_id VARCHAR(80)")
    if "token_version" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0")
    if "failed_login_attempts" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0")
    if "locked_until" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN locked_until DATETIME")
    if "phone_number" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN phone_number VARCHAR(40)")
    if "whatsapp_opt_in" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN whatsapp_opt_in INTEGER DEFAULT 1")
    if "goal" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN goal VARCHAR(160)")
    if "assigned_trainer_id" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN assigned_trainer_id INTEGER")
    if "last_login_at" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN last_login_at DATETIME")
    if "activity_level" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN activity_level VARCHAR(30)")
    if "workouts_per_week" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN workouts_per_week INTEGER")
    if "average_daily_steps" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN average_daily_steps INTEGER")
    if "occupation_activity" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN occupation_activity VARCHAR(30)")
    if "service_tier" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN service_tier VARCHAR(30) DEFAULT 'premium'")
    if "experience_mode" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN experience_mode VARCHAR(30) DEFAULT 'premium'")

    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))


def _ensure_sqlite_diet_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "diet_plans" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("diet_plans")}
    statements = []
    if "meals_json" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN meals_json TEXT DEFAULT '[]'")
    if "active" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN active INTEGER DEFAULT 1")
    if "status" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN status VARCHAR(30) DEFAULT 'published'")
    if "version" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN version INTEGER DEFAULT 1")
    if "calculation_json" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN calculation_json TEXT DEFAULT '{}'")
    if "based_on_metric_id" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN based_on_metric_id INTEGER")
    if "approved_by" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN approved_by INTEGER")
    if "published_at" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN published_at DATETIME")
    if "supersedes_plan_id" not in columns:
        statements.append("ALTER TABLE diet_plans ADD COLUMN supersedes_plan_id INTEGER")

    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))

def _ensure_sqlite_exercise_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "exercises" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("exercises")}
    statements = []
    if "is_visible" not in columns:
        statements.append("ALTER TABLE exercises ADD COLUMN is_visible INTEGER DEFAULT 1")
    if "is_routine_eligible" not in columns:
        statements.append("ALTER TABLE exercises ADD COLUMN is_routine_eligible INTEGER DEFAULT 1")
    if "review_status" not in columns:
        statements.append("ALTER TABLE exercises ADD COLUMN review_status VARCHAR(30) DEFAULT 'approved'")
    if "source" not in columns:
        statements.append("ALTER TABLE exercises ADD COLUMN source VARCHAR(80) DEFAULT 'imperial'")
    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))


def _ensure_sqlite_body_metric_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "body_metrics" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("body_metrics")}
    statements = []
    if "measured_at" not in columns:
        statements.append("ALTER TABLE body_metrics ADD COLUMN measured_at DATETIME")
    if "recorded_at" not in columns:
        statements.append("ALTER TABLE body_metrics ADD COLUMN recorded_at DATETIME")
    if "bmr_source" not in columns:
        statements.append("ALTER TABLE body_metrics ADD COLUMN bmr_source VARCHAR(30)")
    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))
            conn.execute(text("UPDATE body_metrics SET measured_at = created_at WHERE measured_at IS NULL"))
            conn.execute(text("UPDATE body_metrics SET recorded_at = created_at WHERE recorded_at IS NULL"))


def _ensure_sqlite_sync_event_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "sync_events" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("sync_events")}
    statements = []
    if "actor_user_id" not in columns:
        statements.append("ALTER TABLE sync_events ADD COLUMN actor_user_id INTEGER")
    if "target_user_id" not in columns:
        statements.append("ALTER TABLE sync_events ADD COLUMN target_user_id INTEGER")

    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))


def _ensure_sqlite_community_columns() -> None:
    if not database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "community_posts" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("community_posts")}
    if "visibility" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE community_posts ADD COLUMN visibility VARCHAR(30) DEFAULT 'public'"))
