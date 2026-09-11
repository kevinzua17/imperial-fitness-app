#!/usr/bin/env python3
"""Verificación de despliegue v1.20.0, de solo lectura.

Uso:
  python scripts/verify_v120_deployment.py https://api.example.com
  IMPERIAL_ACCESS_TOKEN=... python scripts/verify_v120_deployment.py https://api.example.com

Sin token valida readiness. Con token añade endpoints autenticados de lectura.
No crea, actualiza ni elimina datos.
"""
from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def get_json(url: str, token: str | None = None, timeout: float = 20.0):
    headers = {"Accept": "application/json", "User-Agent": "imperial-v120-verifier/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers, method="GET")
    with urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        return response.status, json.loads(body)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python scripts/verify_v120_deployment.py https://URL-DEL-BACKEND", file=sys.stderr)
        return 2
    base = sys.argv[1].rstrip("/")
    require(base.startswith("https://"), "La URL de producción debe usar HTTPS")
    token = os.getenv("IMPERIAL_ACCESS_TOKEN", "").strip() or None

    status, ready = get_json(f"{base}/health/ready")
    require(status == 200, f"/health/ready devolvió HTTP {status}")
    require(str(ready.get("version", "")).startswith("1.20"), f"Versión inesperada: {ready.get('version')}")
    require(ready.get("status") == "ready", f"Readiness degradado: {ready}")
    require(ready.get("database") == "connected", "La base de datos no está lista")
    require(ready.get("nutrition_v2_ready") is True, "Faltan columnas del motor nutricional v2")
    require(ready.get("exercise_library_v2_ready") is True, "Faltan columnas de ejercicios v2")
    require(ready.get("rls_sensitive_tables_ready") is True, "RLS no está activo en todas las tablas sensibles")
    require(ready.get("redis_ready") is True, "Redis no está disponible para caché/rate limiting distribuido")
    print("OK  readiness v1.20.0, base de datos, Redis, RLS y esquemas")

    if token:
        checks = [
            ("perfil", f"{base}/users/me"),
            ("alimentos", f"{base}/nutrition/foods"),
            ("ejercicios", f"{base}/exercises?{urlencode({'limit': 5, 'offset': 0})}"),
            ("plan actual", f"{base}/nutrition/diet-plans/my-plan"),
        ]
        for label, url in checks:
            try:
                code, payload = get_json(url, token=token)
                require(code == 200, f"{label} devolvió HTTP {code}")
                print(f"OK  {label}: lectura autenticada")
            except HTTPError as exc:
                # 404 para un cliente sin dieta activa es un estado de negocio válido.
                if label == "plan actual" and exc.code == 404:
                    print("OK  plan actual: cliente sin plan publicado (404 esperado)")
                    continue
                raise
    else:
        print("INFO no se ejecutaron lecturas autenticadas: define IMPERIAL_ACCESS_TOKEN para ampliarlas")

    print("OK - verificación de solo lectura completada; no se modificaron usuarios ni contraseñas.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, HTTPError, URLError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR - {exc}", file=sys.stderr)
        raise SystemExit(1)
