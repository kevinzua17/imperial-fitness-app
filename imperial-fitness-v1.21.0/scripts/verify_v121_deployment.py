"""Verificador de solo lectura de Imperial Fitness v1.21.0.

Uso:
  python scripts/verify_v121_deployment.py https://imperial-fitness-api.onrender.com

Opcionalmente prueba login si se entregan variables SOLO en la terminal:
  IMPERIAL_LOGIN_EMAIL=... IMPERIAL_LOGIN_PASSWORD=... python scripts/verify_v121_deployment.py URL --login
No imprime la contraseña ni el token.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

VERSION = "1.21.0"


def request_json(url: str, *, method: str = "GET", body: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Accept": "application/json", "User-Agent": "imperial-fitness-v121-verifier/1.0"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw or "{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            payload = {"raw": raw[:500]}
        return exc.code, payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("backend_url")
    parser.add_argument("--login", action="store_true", help="Prueba /auth/login usando variables IMPERIAL_LOGIN_EMAIL/PASSWORD")
    args = parser.parse_args()
    base = args.backend_url.rstrip("/")

    live_status, live = request_json(base + "/health/live")
    if live_status != 200 or live.get("status") != "alive":
        print(f"ERROR liveness HTTP {live_status}: {live}", file=sys.stderr)
        return 1
    print("OK liveness")

    health_status, health = request_json(base + "/health")
    if health_status != 200:
        print(f"ERROR health HTTP {health_status}: {health}", file=sys.stderr)
        return 1
    if health.get("version") != VERSION:
        print(f"ERROR versión desplegada {health.get('version')!r}; esperada {VERSION}", file=sys.stderr)
        return 1
    print(f"OK versión {VERSION}")

    cap_status, capabilities = request_json(base + "/health/capabilities")
    if cap_status != 200:
        print(f"ERROR capabilities HTTP {cap_status}: {capabilities}", file=sys.stderr)
        return 1
    print("OK capacidades; opcionales:", capabilities.get("optional", {}))

    ready_status, readiness = request_json(base + "/health/ready")
    if ready_status not in {200, 503}:
        print(f"ERROR readiness HTTP {ready_status}: {readiness}", file=sys.stderr)
        return 1
    if readiness.get("database") != "connected":
        print(f"ERROR base de datos: {readiness}", file=sys.stderr)
        return 1
    if readiness.get("admin_access_ready") is False:
        print("ERROR no existe un administrador activo y desbloqueado", file=sys.stderr)
        return 1
    if readiness.get("imperial_lite_ready") is False:
        print("ERROR falta aplicar migración 036 de Imperial Lite", file=sys.stderr)
        return 1
    print(f"OK base de datos; readiness={readiness.get('status', 'desconocido')}")

    if args.login:
        email = os.environ.get("IMPERIAL_LOGIN_EMAIL", "").strip()
        password = os.environ.get("IMPERIAL_LOGIN_PASSWORD", "")
        if not email or not password:
            print("ERROR --login requiere IMPERIAL_LOGIN_EMAIL e IMPERIAL_LOGIN_PASSWORD", file=sys.stderr)
            return 1
        status, payload = request_json(base + "/auth/login", method="POST", body={"email": email, "password": password})
        if status != 200 or not payload.get("access_token"):
            print(f"ERROR login HTTP {status}: {payload.get('detail', 'sin detalle')}", file=sys.stderr)
            return 1
        print("OK login real (token recibido y no mostrado)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
