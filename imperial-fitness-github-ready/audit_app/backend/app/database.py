from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings


settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
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
    if settings.app_env == "production":
        # En producción la estructura se crea con backend/supabase/schema.sql
        # y migraciones RLS, no con metadata.create_all().
        return
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_user_columns()
    _ensure_sqlite_diet_columns()
    _ensure_sqlite_sync_event_columns()


def _ensure_sqlite_user_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
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

    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))


def _ensure_sqlite_diet_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
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

    if statements:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))

def _ensure_sqlite_sync_event_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
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
