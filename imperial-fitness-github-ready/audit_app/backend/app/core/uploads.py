from pathlib import Path
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


async def save_image_upload(file: UploadFile, folder: str) -> str:
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
            import cloudinary
            import cloudinary.uploader

            if settings.cloudinary_url:
                cloudinary.config(cloudinary_url=settings.cloudinary_url)
            else:
                cloudinary.config(
                    cloud_name=settings.cloudinary_cloud_name,
                    api_key=settings.cloudinary_api_key,
                    api_secret=settings.cloudinary_api_secret,
                    secure=True,
                )
            result = cloudinary.uploader.upload(
                content,
                folder=f"imperial-fitness/{folder}",
                resource_type="image",
                overwrite=False,
            )
            secure_url = result.get("secure_url")
            if secure_url:
                return secure_url
            raise HTTPException(status_code=502, detail="Cloudinary no devolvió URL segura.")
        except Exception as exc:
            if settings.app_env == "production":
                raise HTTPException(status_code=502, detail="Error subiendo imagen a Cloudinary.") from exc
            # En local se permite fallback para no bloquear desarrollo si Cloudinary no está configurado.
            pass

    upload_dir = Path(settings.upload_dir) / folder
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{IMAGE_EXTENSIONS[file.content_type]}"
    file_path = upload_dir / filename
    file_path.write_bytes(content)
    return f"/uploads/{folder}/{filename}"