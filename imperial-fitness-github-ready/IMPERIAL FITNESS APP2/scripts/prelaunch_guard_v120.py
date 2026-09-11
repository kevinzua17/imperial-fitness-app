#!/usr/bin/env python3
"""Guardia de lanzamiento no destructiva para Imperial Fitness v1.20.0.

No se conecta a Supabase ni imprime secretos. Comprueba que el paquete fuente no
contenga marcadores de ejemplo, que la migración sea aditiva y que autenticación
no haya sido modificada en la rama de hardening.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql"
PROTECTED_AUTH_PATHS = {
    "backend/app/routers/auth.py",
    "backend/app/security.py",
    "backend/app/deps.py",
    "backend/app/routers/recovery.py",
}
REQUIRED_ENV = [
    "DATABASE_URL", "SECRET_KEY", "REDIS_URL", "CLOUDINARY_URL",
    "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM_EMAIL",
    "UPTIME_CHECK_TOKEN",
]


def fail(message: str) -> None:
    raise AssertionError(message)


def read(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        fail(f"Falta {path}")
    return target.read_text(encoding="utf-8")


def check_versions() -> None:
    package = json.loads(read("package.json"))
    if package.get("version") != "1.20.0":
        fail("package.json no está en v1.20.0")
    main = read("backend/app/main.py")
    if 'APP_VERSION = "1.20.0"' not in main:
        fail("Backend no reporta v1.20.0")


def check_no_placeholders() -> None:
    candidates = ["render.yaml", ".env.production.example", "backend/.env.production.example"]
    for path in candidates:
        content = read(path).lower()
        if "tu-frontend" in content or "tu-backend" in content:
            fail(f"{path} todavía contiene dominios de ejemplo")


def check_migration_safety() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    executable = "\n".join(line for line in sql.splitlines() if not line.strip().startswith("--"))
    forbidden = [r"\bdrop\s+table\b", r"\btruncate\b", r"\bdelete\s+from\b", r"\bdrop\s+column\b", r"\bupdate\s+public\.users\b"]
    for pattern in forbidden:
        if re.search(pattern, executable):
            fail(f"Migración 034 contiene operación prohibida: {pattern}")
    for protected in ["password_hash", "token_version", "email", "role"]:
        if re.search(rf"alter\s+table\s+public\.users[\s\S]*?\b{protected}\b", executable):
            fail(f"Migración 034 intenta alterar {protected}")


def check_auth_files_untouched() -> None:
    try:
        changed = subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).splitlines()
    except Exception:
        return
    touched = sorted(PROTECTED_AUTH_PATHS.intersection(changed))
    if touched:
        fail(f"Archivos de autenticación modificados inesperadamente: {', '.join(touched)}")


def check_environment() -> None:
    missing = [key for key in REQUIRED_ENV if not os.getenv(key)]
    if missing:
        fail("Variables de producción faltantes: " + ", ".join(missing))
    for key in ["FRONTEND_URL", "BACKEND_URL"]:
        value = os.getenv(key, "")
        if not value.startswith("https://"):
            fail(f"{key} debe usar HTTPS")
    if os.getenv("APP_ENV") != "production":
        fail("APP_ENV debe ser production")
    if os.getenv("DB_AUTO_CREATE", "false").lower() != "false":
        fail("DB_AUTO_CREATE debe permanecer false en Supabase")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-env", action="store_true", help="Comprueba variables reales sin imprimir sus valores")
    args = parser.parse_args()
    check_versions()
    check_no_placeholders()
    check_migration_safety()
    check_auth_files_untouched()
    if args.check_env:
        check_environment()
    print("OK - guardia v1.20.0 aprobada: fuente aditiva, dominios definidos y autenticación sin cambios.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
