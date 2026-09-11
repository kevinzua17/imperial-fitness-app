from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "logo-imperial-fitness.png"
ICON_DIR = PUBLIC / "icons"
REGULAR_SIZES = (72, 96, 128, 144, 152, 167, 180, 192, 384, 512, 1024)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(
            "No existe public/logo-imperial-fitness.png. "
            "Guarda primero el logo real con ese nombre exacto o ejecuta: "
            "python scripts/convertir_logo_pwa.py RUTA_DEL_LOGO"
        )

    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit("Falta Pillow. Instala con: python -m pip install pillow") from exc

    ICON_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    w, h = source.size
    crop_px = max(2, int(min(w, h) * 0.006))
    source = source.crop((crop_px, crop_px, w - crop_px, h - crop_px))
    source = ImageOps.fit(source, (1024, 1024), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))

    def save_regular(size: int, path: Path) -> None:
        source.resize((size, size), Image.Resampling.LANCZOS).convert("RGB").save(path, "PNG", optimize=True)

    def save_maskable(size: int, path: Path) -> None:
        canvas = Image.new("RGB", (size, size), (246, 246, 246))
        fitted = ImageOps.contain(source, (int(size * 0.76), int(size * 0.76)), Image.Resampling.LANCZOS)
        canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
        canvas.save(path, "PNG", optimize=True)

    for size in REGULAR_SIZES:
        save_regular(size, ICON_DIR / f"icon-{size}.png")

    save_regular(180, ICON_DIR / "apple-touch-icon.png")
    save_regular(180, ICON_DIR / "apple-touch-icon-imperial-fitness.png")
    save_regular(167, ICON_DIR / "apple-touch-icon-167.png")
    save_regular(152, ICON_DIR / "apple-touch-icon-152.png")
    save_regular(120, ICON_DIR / "apple-touch-icon-120.png")
    save_maskable(192, ICON_DIR / "icon-maskable-192.png")
    save_maskable(512, ICON_DIR / "icon-maskable-512.png")
    save_regular(32, PUBLIC / "favicon-32.png")
    save_regular(16, PUBLIC / "favicon-16.png")

    print("Iconos PWA/iOS generados correctamente sin transparencia ni esquinas preredondeadas.")


if __name__ == "__main__":
    main()
