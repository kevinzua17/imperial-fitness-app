"""Guardia estática no destructiva para Imperial Fitness v1.21.0."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.21.0"


def read(path: str) -> str:
    file = ROOT / path
    if not file.is_file():
        raise AssertionError(f"Falta {path}")
    return file.read_text(encoding="utf-8")


def require(value: bool, message: str) -> None:
    if not value:
        raise AssertionError(message)


def main() -> None:
    package = json.loads(read("package.json"))
    require(package.get("version") == VERSION, "Versión de package.json incorrecta")
    require(f'APP_VERSION = "{VERSION}"' in read("backend/app/main.py"), "Versión backend incorrecta")

    render = read("render.yaml")
    require("healthCheckPath: /health/live" in render, "Render debe comprobar liveness")

    config = read("backend/app/core/config.py")
    for optional in ("REDIS_URL es obligatorio", "SMTP real es obligatorio", "UPTIME_CHECK_TOKEN es obligatorio"):
        require(optional not in config, f"Dependencia opcional bloquea el arranque: {optional}")

    lite = read("backend/app/routers/lite.py")
    require("X-Lite-Session" in read("src/services/liteService.ts"), "Lite debe usar sesión limitada")
    require("hash_token(raw)" in lite and "hash_token(payload.token)" in lite, "Los magic links deben persistirse como hash")
    require('@router.post("/exchange/{token}")' not in lite, "El token no debe viajar en una ruta registrable por el servidor")

    main_ts = read("src/main.tsx")
    require('await import("./components/LitePortal")' in main_ts, "Lite debe cargarse en chunk independiente")
    require('await import("./App")' in main_ts, "La app Pro debe cargarse aparte del portal Lite")

    migration = read("backend/supabase/migrations/036_imperial_lite_professional_v1.21.0.sql").lower()
    executable = "\n".join(line for line in migration.splitlines() if not line.strip().startswith("--"))
    for destructive in (r"\bdrop\s+table\b", r"\btruncate\b", r"\bdelete\s+from\b", r"\bdrop\s+column\b"):
        require(not re.search(destructive, executable), f"Migración destructiva: {destructive}")

    print("OK - guardia v1.21.0 aprobada: arranque resiliente, Lite aislado, enlaces opacos y migración aditiva.")


if __name__ == "__main__":
    main()
