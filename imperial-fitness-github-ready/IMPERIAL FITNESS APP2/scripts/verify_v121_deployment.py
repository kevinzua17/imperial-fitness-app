#!/usr/bin/env python3
"""Verificación de solo lectura para Imperial Fitness v1.20.1."""
from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def get_json(url: str, token: str | None = None, timeout: float = 25.0):
    headers = {"Accept": "application/json", "User-Agent": "imperial-v121-verifier/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, headers=headers, method="GET")
    with urlopen(request, timeout=timeout) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python scripts/verify_v121_deployment.py https://URL-DEL-BACKEND", file=sys.stderr)
        return 2
    base = sys.argv[1].rstrip("/")
    require(base.startswith("https://"), "La URL debe usar HTTPS")
    status, ready = get_json(f"{base}/health/ready")
    require(status == 200, f"Readiness devolvió HTTP {status}")
    require(ready.get("version") == "1.20.1", f"Versión inesperada: {ready.get('version')}")
    require(ready.get("status") == "ready", f"Readiness degradado: {ready}")
    require(ready.get("body_metrics_history_ready") is True, "Faltan columnas del historial corporal")
    require(ready.get("nutrition_v2_ready") is True, "Falta esquema nutricional v2")
    require(ready.get("exercise_library_v2_ready") is True, "Falta esquema de ejercicios v2")
    print("OK - backend v1.20.1 y esquema de historial listos")

    token = os.getenv("IMPERIAL_ACCESS_TOKEN", "").strip()
    user_id = os.getenv("IMPERIAL_TEST_USER_ID", "").strip()
    if token and user_id:
        code, payload = get_json(f"{base}/progress/history/{user_id}", token)
        require(code == 200 and isinstance(payload, list), "El historial no respondió como lista")
        print(f"OK - historial autenticado: {len(payload)} registros visibles")
    else:
        print("INFO - define IMPERIAL_ACCESS_TOKEN e IMPERIAL_TEST_USER_ID para validar historial autenticado")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, HTTPError, URLError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
