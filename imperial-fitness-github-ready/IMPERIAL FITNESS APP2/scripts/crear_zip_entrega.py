from __future__ import annotations

import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / "Imperial-Fitness-v1.21.0-Simple.zip"

EXCLUDED_DIRS = {
    ".git", ".idea", ".vscode", "node_modules", "dist", ".venv", "venv",
    "__pycache__", ".pytest_cache", ".mypy_cache",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".sqlite", ".db", ".log"}
EXCLUDED_FILES = {".env"}


def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if set(rel.parts) & EXCLUDED_DIRS:
        return True
    if path.name in EXCLUDED_FILES:
        return True
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    return False


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()

    files = [p for p in ROOT.rglob("*") if p.is_file() and not should_skip(p)]
    prefix = ROOT.name

    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for file_path in files:
            zipf.write(file_path, Path(prefix) / file_path.relative_to(ROOT))

        manifest = "\n".join([
            "IMPERIAL FITNESS v1.21.0 SIMPLE - ENTREGA",
            f"Generado: {datetime.now().isoformat(timespec='seconds')}",
            "",
            "Incluye frontend, backend, migraciones Supabase, generador PDF y documentación de actualización.",
            "No incluye node_modules, dist, entornos virtuales ni archivos .env privados.",
            "Ejecutar PASOS_ACTUALIZACION_v1.21.0.md antes de producción.",
        ])
        zipf.writestr(str(Path(prefix) / "MANIFIESTO_ENTREGA.txt"), manifest)

    print(f"ZIP creado: {OUTPUT} ({OUTPUT.stat().st_size / (1024 * 1024):.2f} MB)")


if __name__ == "__main__":
    main()
