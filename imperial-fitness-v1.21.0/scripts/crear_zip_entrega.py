from __future__ import annotations

import zipfile
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "imperial-fitness-entrega-completa.zip"

EXCLUDED_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "node_modules",
    "dist",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
}

EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".sqlite",
    ".db",
    ".log",
}

EXCLUDED_FILES = {
    OUTPUT.name,
    ".env",
}


def should_skip(path: Path) -> bool:
    parts = set(path.relative_to(ROOT).parts)
    if parts & EXCLUDED_DIRS:
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

    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        for file_path in files:
            zipf.write(file_path, file_path.relative_to(ROOT))

        manifest = "\n".join(
            [
                "IMPERIAL FITNESS - ENTREGA COMPLETA",
                f"Generado: {datetime.now().isoformat(timespec='seconds')}",
                "",
                "Incluye:",
                "- Frontend React + Vite + Tailwind",
                "- Backend Python FastAPI",
                "- Base nutricional y rutinas",
                "- Componentes de sincronización web/app",
                "- Instrucciones para correr localmente",
                "",
                "No incluye carpetas generadas como node_modules, dist, .venv ni archivos .env privados.",
                "El logo real debe estar en public/logo-imperial-fitness.png si deseas reemplazar el placeholder local.",
            ]
        )
        zipf.writestr("MANIFIESTO_ENTREGA.txt", manifest)

    size_mb = OUTPUT.stat().st_size / (1024 * 1024)
    print(f"ZIP creado correctamente: {OUTPUT.name} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()