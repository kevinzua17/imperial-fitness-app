from pathlib import Path

from app.core.config import get_settings
from app.core.private_files import create_signed_private_file_url, resolve_signed_private_file_token


def login(client, email: str, password: str = "imperial123") -> dict:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_security_headers_are_present_on_public_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
    assert "script-src 'self'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Request-ID"]


def test_login_uses_httponly_refresh_cookie(client):
    response = client.post("/auth/login", json={"email": "admin@imperialfitness.co", "password": "imperial123"})
    assert response.status_code == 200, response.text
    cookie = response.headers.get("set-cookie", "")
    assert "imperial_refresh_token=" in cookie
    assert "HttpOnly" in cookie
    assert "Path=/auth" in cookie
    assert "SameSite=lax" in cookie


def test_metrics_endpoint_is_available_for_non_production_smoke(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert b"imperial_http_requests_total" in response.content or b"python_info" in response.content


def test_private_signed_progress_photo_flow(client, tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "private_upload_dir", str(tmp_path / "private_uploads"))

    user = login(client, "julian@client.com")
    user_id = user["user"]["id"]
    headers = auth_headers(user["access_token"])
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"imperial-private-photo"

    uploaded = client.post(
        "/progress/photos/upload",
        headers=headers,
        data={"client_id": str(user_id), "label": "Frente", "weight": "78.5", "body_fat": "16.2"},
        files={"file": ("progress.png", png_bytes, "image/png")},
    )
    assert uploaded.status_code == 200, uploaded.text
    payload = uploaded.json()
    assert payload["image_url"].startswith("/progress/photos/file/")
    assert not payload["image_url"].startswith("/uploads/")

    served = client.get(payload["image_url"])
    assert served.status_code == 200
    assert served.headers["Cache-Control"].startswith("private, no-store")
    assert served.content == png_bytes


def test_private_file_token_rejects_tampering(tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "private_upload_dir", str(tmp_path))
    folder = tmp_path / "progress"
    folder.mkdir()
    (folder / "secure.png").write_bytes(b"\x89PNG\r\n\x1a\nsecure")

    signed_url = create_signed_private_file_url("progress", "secure.png")
    token = signed_url.rsplit("/", 1)[-1]
    path, media_type = resolve_signed_private_file_token(token)
    assert path.name == "secure.png"
    assert media_type == "image/png"

    bad_token = token[:-1] + ("0" if token[-1] != "0" else "1")
    try:
        resolve_signed_private_file_token(bad_token)
        assert False, "El token manipulado no debe resolverse"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403


def test_payment_receipt_upload_is_stored_as_private_owner_asset(client, tmp_path, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "private_upload_dir", str(tmp_path / "private_uploads"))

    user = login(client, "julian@client.com")
    user_id = user["user"]["id"]
    headers = auth_headers(user["access_token"])
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"imperial-private-receipt"

    uploaded = client.post(
        "/memberships/me/payments/upload",
        headers=headers,
        files={"file": ("receipt.png", png_bytes, "image/png")},
    )
    assert uploaded.status_code == 200, uploaded.text
    reference = uploaded.json()["receipt_url"]
    assert reference.startswith(f"private://payment-receipts-user-{user_id}/")
    assert not reference.startswith("/uploads/")
