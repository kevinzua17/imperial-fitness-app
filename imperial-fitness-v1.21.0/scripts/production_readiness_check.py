from __future__ import annotations

import json
import py_compile
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.21.0"
REQUIRED_FILES = [
    "README.md", "render.yaml", "vercel.json", ".env.production.example", "backend/.env.production.example",
    ".github/workflows/ci.yml", "backend/app/main.py", "backend/app/core/config.py", "backend/app/routers/auth.py",
    "backend/app/routers/lite.py", "backend/app/routers/professional.py", "backend/app/services/plan_pdf.py",
    "backend/supabase/migrations/036_imperial_lite_professional_v1.21.0.sql",
    "src/components/LitePortal.tsx", "src/components/CoachOperationsPanel.tsx", "src/services/liteService.ts",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read(path: str) -> str:
    p = ROOT / path
    require(p.exists() and p.is_file() and p.stat().st_size > 0, f"Falta o está vacío: {path}")
    return p.read_text(encoding="utf-8")


def check_versions() -> None:
    package = json.loads(read("package.json"))
    require(package.get("version") == VERSION, f"package.json debe reportar {VERSION}")
    require(f'APP_VERSION = "{VERSION}"' in read("backend/app/main.py"), "Versión backend desincronizada")
    require(f'imperial-fitness-web@{VERSION}' in read("src/main.tsx"), "Versión frontend/Sentry desincronizada")


def check_deploy_files() -> None:
    backend_env = read("backend/.env.production.example")
    frontend_env = read(".env.production.example")
    for key in ["APP_ENV=production", "DATABASE_URL=", "SECRET_KEY=", "CORS_ORIGINS=", "TRUSTED_HOSTS=", "FRONTEND_URL=", "BACKEND_URL="]:
        require(key in backend_env, f"Falta {key} en backend/.env.production.example")
    for key in ["VITE_API_BASE_URL=", "VITE_DEV_MODE=false"]:
        require(key in frontend_env, f"Falta {key} en .env.production.example")
    render = read("render.yaml")
    require("healthCheckPath: /health/live" in render, "Render debe usar liveness, no readiness, para evitar bucles de caída")
    require("imperial-fitness-api.onrender.com" in render, "URL de backend no definida en render.yaml")


def check_optional_services_do_not_kill_auth() -> None:
    config = read("backend/app/core/config.py")
    forbidden_fatal = [
        'REDIS_URL es obligatorio en producción',
        'SMTP real es obligatorio en producción',
        'UPTIME_CHECK_TOKEN es obligatorio en producción',
        'Cloudinary requiere CLOUDINARY_URL',
    ]
    for text in forbidden_fatal:
        require(text not in config, f"Servicio opcional todavía puede impedir el arranque: {text}")
    main = read("backend/app/main.py")
    require('/health/capabilities' in main, "Falta diagnóstico de capacidades opcionales")


def check_lite_security() -> None:
    lite = read("backend/app/routers/lite.py")
    require("hash_token(raw)" in lite and "hash_token(payload.token)" in lite, "Los enlaces Lite deben almacenarse y validarse por hash")
    require('@router.post("/exchange/{token}")' not in lite, "El magic token no debe viajar en la ruta del backend ni quedar en access logs")
    require("session_hash" in read("backend/app/models.py"), "Falta sesión Lite opaca")
    require("X-Lite-Session" in read("src/services/liteService.ts"), "Frontend Lite no usa sesión separada")
    require("history.replaceState" in read("src/components/LitePortal.tsx"), "El token del magic link debe retirarse de la URL antes del canje")
    require("/lite#token=" in lite, "El magic link debe usar fragmento para no filtrar el token a logs HTTP")
    main_ts = read("src/main.tsx")
    require('await import("./components/LitePortal")' in main_ts and 'await import("./App")' in main_ts, "Lite debe cargarse sin arrastrar el bundle Pro")


def check_migration() -> None:
    sql = read("backend/supabase/migrations/036_imperial_lite_professional_v1.21.0.sql").lower()
    executable = "\n".join(line for line in sql.splitlines() if not line.strip().startswith("--"))
    for pattern in [r"\bdrop\s+table\b", r"\btruncate\b", r"\bdelete\s+from\b", r"\bdrop\s+column\b"]:
        require(not re.search(pattern, executable), f"Migración contiene operación destructiva: {pattern}")
    for table in ["client_portal_links", "lite_sessions", "wellness_checkins", "plan_publications", "client_intake_surveys"]:
        require(f"create table if not exists public.{table}" in sql, f"Falta tabla {table}")


def check_python_syntax() -> None:
    for path in (ROOT / "backend/app").rglob("*.py"):
        py_compile.compile(str(path), doraise=True)


def main() -> int:
    for path in REQUIRED_FILES:
        read(path)
    check_versions(); check_deploy_files(); check_optional_services_do_not_kill_auth(); check_lite_security(); check_migration(); check_python_syntax()
    print(f"OK - paquete {VERSION} listo para CI y despliegue controlado: acceso resiliente, Lite, publicación profesional y seguimiento inteligente presentes.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, ValueError, py_compile.PyCompileError) as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
