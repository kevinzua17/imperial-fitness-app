#!/usr/bin/env python3
"""Guardia estática no destructiva para Imperial Fitness v1.20.1."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read(path: str) -> str:
    target = ROOT / path
    require(target.exists(), f"Falta {path}")
    return target.read_text(encoding="utf-8")


def executable_sql(path: str) -> str:
    return "\n".join(
        line for line in read(path).lower().splitlines()
        if not line.strip().startswith("--")
    )


def check_versions() -> None:
    package = json.loads(read("package.json"))
    require(package.get("version") == "1.20.1", "package.json no está en v1.20.1")
    require('APP_VERSION = "1.20.1"' in read("backend/app/main.py"), "Backend no reporta v1.20.1")


def check_migrations() -> None:
    forbidden = [
        r"\bdrop\s+table\b", r"\btruncate\b", r"\bdelete\s+from\b",
        r"\bdrop\s+column\b", r"\bupdate\s+public\.users\b",
        r"\bpassword_hash\b", r"\btoken_version\b",
    ]
    for path in [
        "backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql",
        "backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql",
    ]:
        sql = executable_sql(path)
        for pattern in forbidden:
            require(not re.search(pattern, sql), f"{path} contiene operación prohibida: {pattern}")
    migration = read("backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql").lower()
    for column in ("measured_at", "recorded_at", "bmr_source"):
        require(column in migration, f"Migración 035 no contempla {column}")


def check_session_restore() -> None:
    api = read("src/services/api.ts")
    app = read("src/App.tsx")
    auth = read("backend/app/routers/auth.py")
    vercel = json.loads(read("vercel.json"))

    require("USE_SAME_ORIGIN_API" in api and "'/api'" in api, "Frontend no usa proxy de primera parte")
    rewrites = vercel.get("rewrites", [])
    require(any(item.get("source") == "/api/:path*" for item in rewrites), "Falta rewrite /api en Vercel")
    require('path="/"' in auth, "Cookie refresh no usa Path=/")
    require('path="/auth"' in auth, "No se limpia la cookie heredada Path=/auth")
    require("definitiveAuthFailure" in app, "La restauración no distingue errores temporales de 401/403")
    require("logoutFromApi();" not in app[app.find("const restoreSession"):app.find("const refreshMembershipState")],
            "restoreSession revoca la sesión por error temporal")
    require("LAST_ACTIVE_TAB_KEY" in app and "history.replaceState" in app,
            "No se conserva el módulo activo")


def check_history_selection() -> None:
    view = read("src/components/ProgressAnalyticsView.tsx")
    require("imperial_body_metrics_target_" in view, "No se conserva el cliente seleccionado")
    require("clients.find(user => user.id === targetUserId)" in view,
            "El módulo no valida que el objetivo sea un cliente")
    require("if (!activeClient)" in view, "El módulo puede consultar al administrador como si fuera cliente")
    require("cache: 'no-store'" in read("src/services/progressService.ts"),
            "El historial puede servirse desde caché de frontend")


def main() -> int:
    check_versions()
    check_migrations()
    check_session_restore()
    check_history_selection()
    print("OK - guardia v1.20.1 aprobada: historial preservado, sesión persistente y SQL no destructivo.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"ERROR - {exc}")
        raise SystemExit(1)
