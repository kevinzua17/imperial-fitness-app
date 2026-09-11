from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "backend" / "supabase" / "migrations" / "034_nutrition_exercise_launch_hardening.sql"


def normalized_sql() -> str:
    return MIGRATION.read_text(encoding="utf-8").lower()


def test_migration_is_additive_and_does_not_delete_user_data():
    sql = normalized_sql()
    forbidden = [
        r"\bdrop\s+table\b",
        r"\btruncate\b",
        r"\bdelete\s+from\b",
        r"\bdrop\s+column\b",
        r"\balter\s+column\s+password_hash\b",
        r"\bupdate\s+public\.users\b",
    ]
    for pattern in forbidden:
        assert not re.search(pattern, sql), f"Patrón destructivo detectado: {pattern}"


def test_migration_never_changes_authentication_columns():
    sql = normalized_sql()
    protected = ["password_hash", "token_version", "failed_login_attempts", "locked_until", "email", "role"]
    executable_sql = "\n".join(line for line in sql.splitlines() if not line.strip().startswith("--"))
    for column in protected:
        assert not re.search(rf"alter\s+table\s+public\.users[\s\S]*?\b{column}\b", executable_sql)


def test_migration_is_transactional_and_idempotent():
    sql = normalized_sql()
    assert "begin;" in sql
    assert "commit;" in sql
    assert "if not exists" in sql
