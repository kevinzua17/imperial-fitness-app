import os
import subprocess
import sys
from pathlib import Path


def test_health_endpoints_and_security_headers(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert response.headers['X-Frame-Options'] == 'DENY'
    assert 'frame-ancestors' in response.headers['Content-Security-Policy']

    assert client.get('/health/live').json()['status'] == 'alive'
    assert client.get('/health/ready').json()['database'] == 'connected'


def test_strict_origin_rejects_unknown_browser_origin(client):
    response = client.get('/users', headers={'Origin': 'https://evil.example.com'})
    assert response.status_code == 403
    assert response.json()['detail'] == 'Origen no permitido para esta API.'


def test_public_docs_and_health_do_not_require_origin_header(client):
    assert client.get('/health').status_code == 200
    assert client.get('/openapi.json').status_code == 200


def test_production_env_examples_are_complete():
    root = Path(__file__).resolve().parents[2]
    backend_env = (root / 'backend/.env.production.example').read_text(encoding='utf-8')
    frontend_env = (root / '.env.production.example').read_text(encoding='utf-8')

    for key in [
        'APP_ENV=production',
        'DATABASE_URL=',
        'SECRET_KEY=',
        'CORS_ORIGINS=',
        'TRUSTED_HOSTS=',
        'STORAGE_MODE=cloudinary',
        'REDIS_URL=',
        'ENABLE_HSTS=true',
        'SMTP_HOST=',
        'SMTP_USERNAME=',
        'SMTP_PASSWORD=',
        'SMTP_FROM_EMAIL=',
        'UPTIME_CHECK_TOKEN=',
    ]:
        assert key in backend_env

    assert 'localhost' not in backend_env.split('CORS_ORIGINS=', 1)[1].splitlines()[0]
    assert 'VITE_API_BASE_URL=' in frontend_env
    assert 'VITE_DEV_MODE=false' in frontend_env


def test_phase7_package_readiness_script_passes():
    root = Path(__file__).resolve().parents[2]
    env = os.environ.copy()
    result = subprocess.run(
        [sys.executable, 'scripts/production_readiness_check.py'],
        cwd=root,
        text=True,
        capture_output=True,
        env=env,
        timeout=20,
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert 'OK - paquete listo' in result.stdout
