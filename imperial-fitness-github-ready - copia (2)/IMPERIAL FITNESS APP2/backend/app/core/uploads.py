from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.core.config import get_settings


IMAGE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def is_valid_image_signature(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False


def configure_cloudinary() -> None:
    settings = get_settings()
    import cloudinary

    if settings.cloudinary_url:
        parsed = urlparse(settings.cloudinary_url)
        if parsed.scheme != "cloudinary" or not parsed.hostname or not parsed.username or not parsed.password:
            raise RuntimeError("CLOUDINARY_URL tiene un formato inválido")
        cloudinary.config(
            cloud_name=parsed.hostname,
            api_key=unquote(parsed.username),
            api_secret=unquote(parsed.password),
            secure=True,
        )
    else:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )


def cloudinary_authenticated_reference(resource_type: str, public_id: str, file_format: str) -> str:
    """Opaque DB reference. It is intentionally not a directly downloadable URL."""
    safe_resource_type = resource_type if resource_type in {"image", "video", "raw"} else "image"
    return f"cloudinary-auth://{safe_resource_type}/{quote(public_id, safe='/')}?format={quote(file_format)}"




def _public_delivery_width(folder: str) -> int:
    normalized = (folder or "").strip().lower()
    if normalized == "avatars":
        return 512
    if normalized == "logos":
        return 800
    if normalized == "branding":
        return 1920
    if normalized in {"exercises", "foods"}:
        return 1200
    return 1600


def optimized_cloudinary_public_url(result: dict, folder: str) -> str | None:
    """Return a responsive delivery URL while retaining the original asset.

    The upload remains untouched in Cloudinary; f_auto/q_auto and c_limit are
    delivery transformations, so replacing this code never destroys originals.
    """
    public_id = str(result.get("public_id") or "").strip()
    if not public_id:
        secure_url = result.get("secure_url")
        return str(secure_url) if secure_url else None
    try:
        import cloudinary.utils

        delivery_options: dict[str, object] = {
            "secure": True,
            "fetch_format": "auto",
            "quality": "auto",
            "width": _public_delivery_width(folder),
            "crop": "limit",
        }
        if result.get("version") is not None:
            delivery_options["version"] = result["version"]
        url, _options = cloudinary.utils.cloudinary_url(public_id, **delivery_options)
        return str(url)
    except Exception:
        secure_url = result.get("secure_url")
        return str(secure_url) if secure_url else None


async def save_image_upload(file: UploadFile, folder: str, private: bool = False) -> str:
    settings = get_settings()
    allowed_types = set(settings.allowed_image_type_list)
    if file.content_type not in allowed_types or file.content_type not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WEBP.")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"La imagen supera {settings.max_upload_size_mb}MB.")
    if not is_valid_image_signature(content, file.content_type):
        raise HTTPException(status_code=400, detail="El archivo no parece ser una imagen válida.")

    if settings.storage_mode == "cloudinary":
        try:
            import cloudinary.uploader

            configure_cloudinary()
            options: dict[str, object] = {
                "folder": f"imperial-fitness/{folder}",
                "resource_type": "image",
                "overwrite": False,
            }
            if private:
                # Authenticated protects the original and every derived asset.
                options["type"] = "authenticated"
                options["public_id"] = uuid4().hex

            result = cloudinary.uploader.upload(content, **options)
            if private:
                public_id = str(result.get("public_id") or "")
                file_format = str(result.get("format") or IMAGE_EXTENSIONS[file.content_type].lstrip("."))
                if public_id:
                    return cloudinary_authenticated_reference("image", public_id, file_format)
                raise HTTPException(status_code=502, detail="Cloudinary no devolvió el identificador privado.")

            delivery_url = optimized_cloudinary_public_url(result, folder)
            if delivery_url:
                return delivery_url
            raise HTTPException(status_code=502, detail="Cloudinary no devolvió URL segura.")
        except HTTPException:
            raise
        except Exception as exc:
            if settings.app_env == "production":
                raise HTTPException(status_code=502, detail="Error subiendo imagen privada a Cloudinary." if private else "Error subiendo imagen a Cloudinary.") from exc
            # Solo en desarrollo se permite almacenamiento local como respaldo.

    root_dir = Path(settings.private_upload_dir if private else settings.upload_dir)
    upload_dir = root_dir / folder
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{IMAGE_EXTENSIONS[file.content_type]}"
    file_path = upload_dir / filename
    file_path.write_bytes(content)
    if private:
        return f"private://{folder}/{filename}"
    return f"/uploads/{folder}/{filename}"
