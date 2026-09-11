from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "README_ENTREGA_COMPLETA.md",
    "docs/DEVOPS_RUNBOOK.md",
    "docs/PLATFORM_HARDENING.md",
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
    assert_contains("docs/DEVOPS_RUNBOOK.md", ["Backend", "Frontend", "Rollback"])
    assert_contains("docs/PLATFORM_HARDENING.md", ["CORS", "HSTS", "rate limit"])

    print("OK - paquete listo para validación de producción controlada.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
