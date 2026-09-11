from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "README_ENTREGA_COMPLETA.md",
    "docs/DEVOPS_RUNBOOK.md",
    "docs/PLATFORM_HARDENING.md",
    "docs/RELEASE_96_READINESS.md",
    "scripts/secret_scan.py",
    ".vercelignore",
    ".renderignore",
    "backend/.env.example",
    "backend/.env.production.example",
    ".env.example",
    ".env.production.example",
    "docker-compose.yml",
    "Dockerfile.web",
    "backend/Dockerfile",
    ".github/workflows/ci.yml",
    "capacitor.config.ts",
    "docs/MOBILE_BUILD_GUIDE.md",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/apple-touch-icon.png",
    "src/utils/safeStorage.ts",
    "src/utils/html.ts",
    "backend/app/core/nutrition_engine.py",
    "backend/tests/test_diet_plan_workflow_v2.py",
    "backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql",
    "backend/supabase/diagnostics/VERIFICAR_MIGRACION_034_v1.20.0.sql",
    "backend/supabase/diagnostics/VERIFICAR_RLS_Y_ROL_API_v1.20.0.sql",
    "scripts/prelaunch_guard_v120.py",
    "scripts/verify_v120_deployment.py",
    "scripts/load_test_500_readonly.py",
    "docs/REPORTE_IMPLEMENTACION_v1.20.0.md",
    "docs/CHECKLIST_LANZAMIENTO_500_v1.20.0.md",
    "docs/ROLLBACK_v1.20.0.md",
    "CHANGELOG_v1.20.0.md",
]

BACKEND_PRODUCTION_KEYS = [
    "APP_ENV=production",
    "DATABASE_URL=",
    "SECRET_KEY=",
    "CORS_ORIGINS=",
    "TRUSTED_HOSTS=",
    "STORAGE_MODE=cloudinary",
    "CLOUDINARY_URL=",
    "REDIS_URL=",
    "ENABLE_HSTS=true",
    "SMTP_HOST=",
    "SMTP_USERNAME=",
    "SMTP_PASSWORD=",
    "SMTP_FROM_EMAIL=",
    "UPTIME_CHECK_TOKEN=",
]

FRONTEND_PRODUCTION_KEYS = [
    "VITE_API_BASE_URL=",
    "VITE_DEV_MODE=false",
]


def assert_file(path: str) -> Path:
    file_path = ROOT / path
    if not file_path.exists():
        raise AssertionError(f"Falta archivo requerido: {path}")
    if file_path.is_file() and file_path.stat().st_size == 0:
        raise AssertionError(f"Archivo vacío: {path}")
    return file_path


def assert_contains(path: str, needles: list[str]) -> None:
    content = assert_file(path).read_text(encoding="utf-8")
    missing = [needle for needle in needles if needle not in content]
    if missing:
        raise AssertionError(f"{path} no contiene: {', '.join(missing)}")


def main() -> int:
    for path in REQUIRED_FILES:
        assert_file(path)

    assert_contains("backend/.env.production.example", BACKEND_PRODUCTION_KEYS)
    assert_contains(".env.production.example", FRONTEND_PRODUCTION_KEYS)
    assert_contains("README_ENTREGA_COMPLETA.md", ["Fase 7", "Checklist", "producción", "APK", "Capacitor"])
    assert_contains("docs/RELEASE_96_READINESS.md", ["96%", "Render", "Vercel", "39 pruebas", "secret_scan"])
    assert_contains("docs/DEVOPS_RUNBOOK.md", ["Backend", "Frontend", "Rollback"])
    assert_contains("docs/PLATFORM_HARDENING.md", ["CORS", "HSTS", "rate limit"])
    assert_contains("docs/REPORTE_IMPLEMENTACION_v1.20.0.md", ["motor nutricional", "borrador", "No se modificaron"])
    assert_contains("docs/CHECKLIST_LANZAMIENTO_500_v1.20.0.md", ["BLOQUEANTE", "500", "password_hash"])
    assert_contains("docs/ROLLBACK_v1.20.0.md", ["v1.19.1", "No eliminar columnas", "password_hash"])
    assert_contains("backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql", ["begin;", "commit;", "add column if not exists"])

    print("OK - paquete v1.20.0 listo para validación de producción controlada.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
