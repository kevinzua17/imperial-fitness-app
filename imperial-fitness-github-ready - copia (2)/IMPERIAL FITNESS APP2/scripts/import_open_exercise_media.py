#!/usr/bin/env python3
"""Genera src/data/generatedOpenExerciseMedia.ts desde una base abierta descargada por el dueño del proyecto.

No descarga contenido de internet ni toca Supabase. Recibe un JSON local con ejercicios y crea un
mapa frontend con URL de imagen/animación/video, fuente y licencia.

Uso ejemplo:
  python scripts/import_open_exercise_media.py --input /ruta/exercises.json --source "free-exercise-db" --license "Unlicense" --image-prefix "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

El JSON puede ser una lista de objetos con campos comunes como:
  name, title, id, image, imageUrl, image_url, gifUrl, gif_url, animationUrl, videoUrl, video_url
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "data" / "generatedOpenExerciseMedia.ts"


def pick(row: dict[str, Any], *names: str) -> str:
    for name in names:
        value = row.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    images = row.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str):
            return first.strip()
        if isinstance(first, dict):
            for key in ("url", "src", "image"):
                value = first.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
    return ""


def media_type_for(url: str) -> str:
    clean = url.lower().split("?")[0]
    if clean.endswith((".mp4", ".webm", ".mov")):
        return "video"
    if clean.endswith(".gif"):
        return "gif"
    if clean.endswith(".webp"):
        return "animated-webp"
    return "open-source"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Ruta al JSON local de la base abierta")
    parser.add_argument("--source", default="Base abierta validada")
    parser.add_argument("--license", default="Revisar licencia del proveedor")
    parser.add_argument("--attribution", default="")
    parser.add_argument("--image-prefix", default="", help="Prefijo opcional para rutas relativas de imágenes, por ejemplo https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/")
    args = parser.parse_args()

    raw = json.loads(Path(args.input).read_text(encoding="utf-8"))
    rows = raw.get("exercises", raw) if isinstance(raw, dict) else raw
    if not isinstance(rows, list):
      raise SystemExit("El JSON debe ser una lista de ejercicios o un objeto con clave exercises")

    records: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = pick(row, "name", "title", "exercise", "exerciseName")
        if not name:
            continue
        animation = pick(row, "animationUrl", "animation_url", "gifUrl", "gif_url", "gif")
        video = pick(row, "videoUrl", "video_url", "video", "mp4")
        image = pick(row, "imageUrl", "image_url", "image", "thumbnail", "thumbnailUrl")
        if image and args.image_prefix and not image.startswith(("http://", "https://", "/")):
            image = f"{args.image_prefix.rstrip('/')}/{image.lstrip('/')}"
        preferred = video or animation or image
        records.append({
            "id": str(row.get("id", "")),
            "name": name,
            "imageUrl": image,
            "animationUrl": animation,
            "videoUrl": video,
            "mediaType": media_type_for(preferred),
            "mediaSource": args.source,
            "mediaLicense": args.license,
            "attribution": args.attribution,
            "mediaNotes": "Importado desde base abierta local. Validar licencia antes de uso comercial.",
        })

    payload = json.dumps(records, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "import { ExerciseMediaType } from './exerciseCatalog';\n\n"
        "export interface OpenExerciseMediaRecord {\n"
        "  id?: string;\n  name: string;\n  imageUrl?: string;\n  animationUrl?: string;\n  videoUrl?: string;\n"
        "  mediaType?: ExerciseMediaType;\n  mediaSource: string;\n  mediaLicense: string;\n  attribution?: string;\n  mediaNotes?: string;\n}\n\n"
        f"export const GENERATED_OPEN_EXERCISE_MEDIA: OpenExerciseMediaRecord[] = {payload};\n",
        encoding="utf-8",
    )
    print(f"OK - generados {len(records)} registros en {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
