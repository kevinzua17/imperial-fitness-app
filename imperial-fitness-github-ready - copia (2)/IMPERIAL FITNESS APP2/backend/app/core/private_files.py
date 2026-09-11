from __future__ import annotations

import base64
import hashlib
import hmac
import mimetypes
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from fastapi import HTTPException
from starlette.responses import FileResponse

from app.core.config import get_settings
from app.core.uploads import configure_cloudinary


LOCAL_PRIVATE_SCHEME = "private://"
CLOUDINARY_AUTH_SCHEME = "cloudinary-auth://"


def _urlsafe_b64_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _urlsafe_b64_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _signature(message: str) -> str:
    settings = get_settings()
    return hmac.new(settings.secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def is_private_asset_reference(reference: str | None) -> bool:
    return bool(reference and (reference.startswith(LOCAL_PRIVATE_SCHEME) or reference.startswith(CLOUDINARY_AUTH_SCHEME)))


def private_asset_belongs_to_folder(reference: str | None, expected_folder: str) -> bool:
    if not reference:
        return False
    if reference.startswith(LOCAL_PRIVATE_SCHEME):
        raw_path = reference.removeprefix(LOCAL_PRIVATE_SCHEME)
        folder, separator, _filename = raw_path.partition("/")
        return bool(separator and folder == expected_folder)
    if reference.startswith(CLOUDINARY_AUTH_SCHEME):
        try:
            parsed = urlparse(reference)
            public_id = unquote(parsed.path.lstrip("/"))
        except Exception:
            return False
        return public_id.startswith(f"imperial-fitness/{expected_folder}/")
    return False


def create_signed_private_file_url(folder: str, filename: str, expires_in: int | None = None) -> str:
    settings = get_settings()
    safe_folder = Path(folder).name
    safe_filename = Path(filename).name
    expires_at = int(time.time()) + int(expires_in or settings.signed_url_expire_seconds)
    payload = f"{safe_folder}/{safe_filename}:{expires_at}"
    token = f"{_urlsafe_b64_encode(payload.encode('utf-8'))}.{_signature(payload)}"
    return f"/progress/photos/file/{token}"


def create_private_asset_access_url(reference: str | None, expires_in: int | None = None) -> str | None:
    """Convert an opaque private reference into a short-lived access URL."""
    if not reference:
        return None
    if reference.startswith(LOCAL_PRIVATE_SCHEME):
        raw_path = reference.removeprefix(LOCAL_PRIVATE_SCHEME)
        folder, separator, filename = raw_path.partition("/")
        if not separator or not folder or not filename:
            raise HTTPException(status_code=500, detail="Referencia privada local inválida.")
        return create_signed_private_file_url(folder, filename, expires_in=expires_in)
    if reference.startswith(CLOUDINARY_AUTH_SCHEME):
        try:
            import cloudinary.utils

            settings = get_settings()
            parsed = urlparse(reference)
            resource_type = parsed.netloc or "image"
            public_id = unquote(parsed.path.lstrip("/"))
            file_format = parse_qs(parsed.query).get("format", [""])[0]
            if not public_id or not file_format:
                raise ValueError("missing public id or format")
            configure_cloudinary()
            expires_at = int(time.time()) + int(expires_in or settings.signed_url_expire_seconds)
            return cloudinary.utils.private_download_url(
                public_id,
                file_format,
                resource_type=resource_type,
                type="authenticated",
                expires_at=expires_at,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail="No se pudo generar el acceso temporal al archivo privado.") from exc
    return reference


def resolve_signed_private_file_token(token: str) -> tuple[Path, str]:
    settings = get_settings()
    try:
        encoded_payload, supplied_signature = token.split(".", 1)
        payload = _urlsafe_b64_decode(encoded_payload).decode("utf-8")
        expected_signature = _signature(payload)
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError("bad signature")
        raw_path, raw_expires_at = payload.rsplit(":", 1)
        expires_at = int(raw_expires_at)
    except Exception as exc:
        raise HTTPException(status_code=403, detail="Enlace inválido o manipulado.") from exc

    if expires_at < int(time.time()):
        raise HTTPException(status_code=403, detail="Enlace expirado.")

    folder, filename = raw_path.split("/", 1)
    safe_folder = Path(folder).name
    safe_filename = Path(filename).name
    private_root = Path(settings.private_upload_dir).resolve()
    file_path = (private_root / safe_folder / safe_filename).resolve()
    if not str(file_path).startswith(str(private_root)) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")
    media_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return file_path, media_type


def private_file_response(token: str) -> FileResponse:
    file_path, media_type = resolve_signed_private_file_token(token)
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
        },
    )
