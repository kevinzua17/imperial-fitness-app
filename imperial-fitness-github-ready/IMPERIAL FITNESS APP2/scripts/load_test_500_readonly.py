#!/usr/bin/env python3
"""Prueba de carga SOLO LECTURA para el lanzamiento a 500 usuarios.

Ejemplo:
  LOAD_TEST_TOKEN='...' python scripts/load_test_500_readonly.py \
    --base-url https://imperial-fitness-api.onrender.com --concurrency 50 --requests 500

No crea usuarios, no modifica dietas, no carga imágenes y nunca imprime el token.
"""
from __future__ import annotations

import argparse
import json
import os
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass


@dataclass
class Result:
    endpoint: str
    status: int
    elapsed_ms: float
    error: str = ""


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * pct)))
    return ordered[index]


def request_once(base_url: str, endpoint: str, token: str | None, timeout: float) -> Result:
    headers = {"Accept": "application/json", "User-Agent": "ImperialFitness-ReadOnlyLoadTest/1.20.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base_url.rstrip('/')}{endpoint}", headers=headers, method="GET")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response.read(4096)
            return Result(endpoint, response.status, (time.perf_counter() - started) * 1000)
    except urllib.error.HTTPError as exc:
        return Result(endpoint, exc.code, (time.perf_counter() - started) * 1000, f"HTTP {exc.code}")
    except Exception as exc:  # noqa: BLE001 - se resume sin exponer datos sensibles
        return Result(endpoint, 0, (time.perf_counter() - started) * 1000, type(exc).__name__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--concurrency", type=int, default=50)
    parser.add_argument("--requests", type=int, default=500)
    parser.add_argument("--timeout", type=float, default=15)
    parser.add_argument("--max-error-percent", type=float, default=1.0)
    parser.add_argument("--max-p95-ms", type=float, default=2000)
    parser.add_argument("--output", default="load-test-v120.json")
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 100:
        raise SystemExit("Concurrencia permitida: 1-100 para proteger producción.")
    if not 1 <= args.requests <= 5000:
        raise SystemExit("Solicitudes permitidas: 1-5000.")

    token = os.getenv("LOAD_TEST_TOKEN")
    endpoints = ["/health/ready"] if not token else [
        "/health/ready",
        "/exercises?limit=60&offset=0",
        "/nutrition/diet-plans/my-plan",
        "/nutrition/foods?limit=100",
    ]
    jobs = [endpoints[index % len(endpoints)] for index in range(args.requests)]
    started = time.perf_counter()
    results: list[Result] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(request_once, args.base_url, endpoint, token, args.timeout) for endpoint in jobs]
        for future in as_completed(futures):
            results.append(future.result())

    duration = time.perf_counter() - started
    def is_expected(row: Result) -> bool:
        if 200 <= row.status < 400:
            return True
        # Un cliente sin plan publicado recibe 404: es un estado válido y de solo lectura.
        return row.endpoint == "/nutrition/diet-plans/my-plan" and row.status == 404

    failures = [row for row in results if not is_expected(row)]
    elapsed = [row.elapsed_ms for row in results]
    report = {
        "version": "1.20.0",
        "mode": "authenticated-read-only" if token else "health-only",
        "requests": len(results),
        "concurrency": args.concurrency,
        "duration_seconds": round(duration, 2),
        "requests_per_second": round(len(results) / max(duration, 0.001), 2),
        "success_percent": round((len(results) - len(failures)) / max(len(results), 1) * 100, 2),
        "error_percent": round(len(failures) / max(len(results), 1) * 100, 2),
        "latency_ms": {
            "mean": round(statistics.mean(elapsed), 2) if elapsed else 0,
            "p50": round(percentile(elapsed, 0.50), 2),
            "p95": round(percentile(elapsed, 0.95), 2),
            "p99": round(percentile(elapsed, 0.99), 2),
            "max": round(max(elapsed), 2) if elapsed else 0,
        },
        "status_counts": {},
        "expected_business_statuses": {"diet_plan_404_without_active_plan": 0},
        "errors": {},
    }
    for row in results:
        key = str(row.status)
        report["status_counts"][key] = report["status_counts"].get(key, 0) + 1
        if row.endpoint == "/nutrition/diet-plans/my-plan" and row.status == 404:
            report["expected_business_statuses"]["diet_plan_404_without_active_plan"] += 1
        elif row.error:
            report["errors"][row.error] = report["errors"].get(row.error, 0) + 1

    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    passed = report["error_percent"] <= args.max_error_percent and report["latency_ms"]["p95"] <= args.max_p95_ms
    print("APROBADA" if passed else "NO APROBADA", "- prueba de carga solo lectura")
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
