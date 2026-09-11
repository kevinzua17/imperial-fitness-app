from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
ICON_DIR = PUBLIC / "icons"
TARGET_LOGO = PUBLIC / "logo-imperial-fitness.png"


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Uso: python convertir_logo_pwa.py RUTA_DEL_LOGO")

    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"No existe el archivo: {source}")

    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit("Falta Pillow. Instala con: python -m pip install pillow") from exc

    PUBLIC.mkdir(parents=True, exist_ok=True)
    ICON_DIR.mkdir(parents=True, exist_ok=True)

    image = Image.open(source).convert("RGBA")

    # Guarda el logo real en PNG para que lo usen login, offline, manifest y service worker.
    logo_canvas = Image.new("RGBA", image.size, (255, 255, 255, 255))
    logo_canvas.alpha_composite(image)
    logo_canvas.convert("RGB").save(TARGET_LOGO, format="PNG", optimize=True)

    for size in (192, 512):
      canvas = Image.new("RGBA", (size, size), (245, 245, 245, 255))
      padding = int(size * 0.04)
      fitted = ImageOps.contain(image, (size - padding * 2, size - padding * 2))
      x = (size - fitted.width) // 2
      y = (size - fitted.height) // 2
      canvas.alpha_composite(fitted, (x, y))
      canvas.convert("RGB").save(ICON_DIR / f"icon-{size}.png", format="PNG", optimize=True)

    print("Logo e iconos PWA generados correctamente:")
    print(f"- {TARGET_LOGO.relative_to(ROOT)}")
    print(f"- {(ICON_DIR / 'icon-192.png').relative_to(ROOT)}")
    print(f"- {(ICON_DIR / 'icon-512.png').relative_to(ROOT)}")


if __name__ == "__main__":
    main()