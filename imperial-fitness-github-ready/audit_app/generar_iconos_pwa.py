from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "public" / "logo-imperial-fitness.png"
ICON_DIR = ROOT / "public" / "icons"


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(
            "No existe public/logo-imperial-fitness.png. "
            "Guarda primero el logo real con ese nombre exacto o ejecuta: "
            "python convertir_logo_pwa.py RUTA_DEL_LOGO"
        )

    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit(
            "Falta Pillow. Instala con: python -m pip install pillow"
        ) from exc

    ICON_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")

    for size in (192, 512):
        canvas = Image.new("RGBA", (size, size), (5, 5, 5, 255))
        padding = int(size * 0.08)
        fitted = ImageOps.contain(source, (size - padding * 2, size - padding * 2))
        x = (size - fitted.width) // 2
        y = (size - fitted.height) // 2
        canvas.alpha_composite(fitted, (x, y))
        canvas.save(ICON_DIR / f"icon-{size}.png")

    print("Iconos PWA generados correctamente:")
    print("- public/icons/icon-192.png")
    print("- public/icons/icon-512.png")


if __name__ == "__main__":
    main()