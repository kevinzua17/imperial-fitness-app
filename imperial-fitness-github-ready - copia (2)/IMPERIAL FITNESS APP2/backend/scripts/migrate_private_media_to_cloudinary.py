"""Migrate legacy progress photos and payment receipts to authenticated Cloudinary assets.

Dry-run by default:
  cd backend
  python scripts/migrate_private_media_to_cloudinary.py

Apply changes after reviewing the report:
  python scripts/migrate_private_media_to_cloudinary.py --apply

The script cannot recover files already deleted from Render's ephemeral disk. Those
are reported as MISSING so the affected user can be asked to upload them again.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import text

from app.core.config import get_settings
from app.core.private_files import CLOUDINARY_AUTH_SCHEME, LOCAL_PRIVATE_SCHEME
from app.core.uploads import cloudinary_authenticated_reference, configure_cloudinary
from app.database import engine


def local_source(reference: str) -> Path | None:
    settings = get_settings()
    if reference.startswith(LOCAL_PRIVATE_SCHEME):
        relative = reference.removeprefix(LOCAL_PRIVATE_SCHEME)
        return Path(settings.private_upload_dir) / relative
    if reference.startswith("/uploads/"):
        return Path(settings.upload_dir).parent / reference.lstrip("/")
    return None


def migrate_source(reference: str, folder: str, apply: bool) -> tuple[str, str | None]:
    if not reference:
        return "EMPTY", None
    if reference.startswith(CLOUDINARY_AUTH_SCHEME):
        return "ALREADY_PRIVATE", reference

    source: str | Path = reference
    local = local_source(reference)
    if local is not None:
        source = local
        if not local.is_file():
            return "MISSING", None
    elif not urlparse(reference).scheme in {"http", "https"}:
        return "UNSUPPORTED", None

    if not apply:
        return "READY", None

    import cloudinary.uploader

    configure_cloudinary()
    result = cloudinary.uploader.upload(
        str(source),
        folder=f"imperial-fitness/{folder}",
        resource_type="image",
        type="authenticated",
        overwrite=False,
    )
    public_id = str(result.get("public_id") or "")
    file_format = str(result.get("format") or "")
    if not public_id or not file_format:
        raise RuntimeError("Cloudinary no devolvió public_id/format")
    return "MIGRATED", cloudinary_authenticated_reference("image", public_id, file_format)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Upload and update database rows")
    args = parser.parse_args()

    settings = get_settings()
    if settings.storage_mode != "cloudinary":
        raise SystemExit("STORAGE_MODE debe ser cloudinary")

    counters: dict[str, int] = {}
    updates: list[tuple[str, int, str]] = []
    with engine.connect() as connection:
        progress_rows = connection.execute(text("select id, client_id, image_url from public.progress_photos order by id")).mappings().all()
        payment_rows = connection.execute(text("select id, user_id, receipt_url from public.membership_payments where coalesce(receipt_url, '') <> '' order by id")).mappings().all()

    for row in progress_rows:
        status, new_reference = migrate_source(str(row["image_url"] or ""), f"progress-user-{row['client_id']}", args.apply)
        counters[f"progress:{status}"] = counters.get(f"progress:{status}", 0) + 1
        print(f"progress_photos id={row['id']} client={row['client_id']}: {status}")
        if new_reference and new_reference != row["image_url"]:
            updates.append(("progress", int(row["id"]), new_reference))

    for row in payment_rows:
        status, new_reference = migrate_source(str(row["receipt_url"] or ""), f"payment-receipts-user-{row['user_id']}", args.apply)
        counters[f"payment:{status}"] = counters.get(f"payment:{status}", 0) + 1
        print(f"membership_payments id={row['id']} user={row['user_id']}: {status}")
        if new_reference and new_reference != row["receipt_url"]:
            updates.append(("payment", int(row["id"]), new_reference))

    if args.apply and updates:
        with engine.begin() as connection:
            for kind, row_id, new_reference in updates:
                if kind == "progress":
                    connection.execute(text("update public.progress_photos set image_url = :reference where id = :id"), {"reference": new_reference, "id": row_id})
                else:
                    connection.execute(text("update public.membership_payments set receipt_url = :reference where id = :id"), {"reference": new_reference, "id": row_id})

    print("\nResumen")
    for key in sorted(counters):
        print(f"  {key}: {counters[key]}")
    print(f"  database_updates: {len(updates) if args.apply else 0}")
    if not args.apply:
        print("\nDry-run: no se subió ni modificó nada. Ejecuta nuevamente con --apply después de revisar MISSING/UNSUPPORTED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
