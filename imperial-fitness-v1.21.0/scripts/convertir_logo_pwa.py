from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TARGET_LOGO = PUBLIC / "logo-imperial-fitness.png"


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Uso: python scripts/convertir_logo_pwa.py RUTA_DEL_LOGO")

    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"No existe el archivo: {source}")

    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit("Falta Pillow. Instala con: python -m pip install pillow") from exc

    PUBLIC.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGB")
    image = ImageOps.fit(image, (1024, 1024), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    image.save(TARGET_LOGO, format="PNG", optimize=True)

    subprocess.run([sys.executable, str(ROOT / "scripts" / "generar_iconos_pwa.py")], check=True)
    print(f"Logo base actualizado: {TARGET_LOGO.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
