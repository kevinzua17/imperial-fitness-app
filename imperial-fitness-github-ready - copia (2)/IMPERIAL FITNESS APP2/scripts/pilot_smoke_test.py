#!/usr/bin/env python3
"""Smoke test básico para piloto.

Uso:
  python scripts/pilot_smoke_test.py http://localhost:8000

Requiere que la base tenga los usuarios seed:
  admin@imperialfitness.co / imperial123
  francy@imperialfitness.co / imperial123
  julian@client.com / imperial123
"""
from __future__ import annotations

import json
import sys
from urllib import request, error

BASE_URL = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://localhost:8000'


def call(path: str, method: str = 'GET', token: str | None = None, payload: dict | None = None):
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = request.Request(f'{BASE_URL}{path}', data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with request.urlopen(req, timeout=10) as res:
            body = res.read().decode('utf-8')
            return res.status, json.loads(body) if body else None
    except error.HTTPError as exc:
        body = exc.read().decode('utf-8')
        return exc.code, body


def login(email: str) -> dict:
    status, body = call('/auth/login', 'POST', payload={'email': email, 'password': 'imperial123'})
    assert status == 200, f'Login failed for {email}: {status} {body}'
    return body


def main():
    admin = login('admin@imperialfitness.co')
    trainer = login('francy@imperialfitness.co')
    client = login('julian@client.com')

    checks = []
    checks.append(('admin users', call('/users', token=admin['access_token'])[0] == 200))
    checks.append(('client blocked users', call('/users', token=client['access_token'])[0] == 403))
    checks.append(('trainer foods', call('/nutrition/foods', token=trainer['access_token'])[0] == 200))
    checks.append(('client my diet', call('/nutrition/diet-plans/my-plan', token=client['access_token'])[0] == 200))
    checks.append(('client my routine', call('/routines/assigned/my-routine', token=client['access_token'])[0] == 200))
    checks.append(('admin sync', call('/sync/events', token=admin['access_token'])[0] == 200))

    failed = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print(f'[{"OK" if ok else "FAIL"}] {name}')
    if failed:
        raise SystemExit(f'Fallas smoke test: {failed}')
    print('Smoke test piloto completado correctamente.')


if __name__ == '__main__':
    main()
