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
    "CHANGELOG_v1.21.0.md",
    "src/app/modules.ts",
    "src/components/ClientPlanView.tsx",
    "src/components/ProgressHubView.tsx",
    "src/components/CoachHubView.tsx",
    "src/components/AccountHubView.tsx",
    "src/components/NutritionSafetyReviewCard.tsx",
    "src/components/TrainingVolumeAuditPanel.tsx",
    "src/services/reportService.ts",
    "src/utils/trainingVolume.ts",
    "src/types/domain.ts",
    "backend/app/routers/reports.py",
    "backend/app/services/plan_pdf.py",
    "backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql",
    "backend/supabase/migrations/036_simplified_experience_nutrition_safety.sql",
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
    assert_contains("backend/supabase/migrations/035_restore_body_metrics_history_and_session.sql", ["pg_advisory_xact_lock", "bmr_source", "No se crea idx_body_metrics_user_effective_date_desc"] )
    assert_contains("backend/supabase/migrations/036_simplified_experience_nutrition_safety.sql", ["food_allergies", "food_intolerances", "medical_conditions", "medications"])
    assert_contains("src/app/modules.ts", ["dashboard", "personal_plan", "progress_hub", "coach_hub", "profile"])
    assert_contains("backend/app/routers/reports.py", ["plan.pdf", "build_plan_pdf"])
    assert_contains("backend/app/services/plan_pdf.py", ["reportlab", "routine", "diet"])

    migration_027 = assert_file("backend/supabase/migrations/027_inbody_fecha_real_medicion.sql").read_text(encoding="utf-8")
    migration_028 = assert_file("backend/supabase/migrations/028_mis_medidas_fecha_real_global.sql").read_text(encoding="utf-8")
    if "add column measured_at %s" not in migration_027 or "v_created_at_type" not in migration_027:
        raise AssertionError("027 no garantiza el mismo tipo temporal de created_at")
    if "coalesce(measured_at, created_at) desc" in migration_028 and "--   (user_id, coalesce" not in migration_028:
        raise AssertionError("028 todavía contiene un índice funcional COALESCE activo")

    print("OK - paquete v1.21.0 Simple pasó los controles estáticos de preparación disponibles.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
