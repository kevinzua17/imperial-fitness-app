from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {
    '.git', 'node_modules', 'dist', '__pycache__', '.pytest_cache', '.venv', 'venv',
    'docs/archive', '.mypy_cache', '.ruff_cache'
}
EXCLUDED_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.ico', '.zip', '.db', '.pyc', '.lock'}
PLACEHOLDERS = ('', 'true', 'false', 'none', 'null', 'changeme', 'example', 'placeholder', 'tu-', 'test-', 'your-')
ALLOWLIST_PATTERNS = [
    re.compile(r'change-this-secret-key-before-production', re.I),
    re.compile(r'test-secret-key-for-imperial-fitness', re.I),
    re.compile(r'imperial123', re.I),
    re.compile(r'TU-(FRONTEND|BACKEND)', re.I),
]
TOKEN_PATTERNS = [
    re.compile(r'sk-[A-Za-z0-9_-]{20,}'),
    re.compile(r'xox[baprs]-[A-Za-z0-9-]{20,}'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'),
]
ENV_SECRET_RE = re.compile(r'^\s*(?:export\s+)?([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|SERVICE_ROLE|DATABASE_URL|CLOUDINARY_URL)[A-Z0-9_]*)\s*=\s*(.+?)\s*$')


def should_skip(path: Path) -> bool:
    rel_parts = set(path.relative_to(ROOT).parts)
    if rel_parts & EXCLUDED_DIRS:
        return True
    return path.suffix.lower() in EXCLUDED_SUFFIXES


def is_allowed(line: str) -> bool:
    return any(pattern.search(line) for pattern in ALLOWLIST_PATTERNS)


def suspicious_env_value(value: str) -> bool:
    value = value.strip().strip('"\'')
    low = value.lower()
    if any(low.startswith(prefix) for prefix in PLACEHOLDERS):
        return False
    if '${' in value or '$' in value or '<' in value or '>' in value:
        return False
    # Example env files may intentionally show an empty slot or obvious instruction.
    if low in {'sync: false', 'false', 'true'}:
        return False
    return len(value) >= 12


def main() -> int:
    findings: list[str] = []
    for path in ROOT.rglob('*'):
        if not path.is_file() or should_skip(path):
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for number, line in enumerate(text.splitlines(), start=1):
            if is_allowed(line):
                continue
            if any(pattern.search(line) for pattern in TOKEN_PATTERNS):
                findings.append(f'{path.relative_to(ROOT)}:{number}: token real con patrón conocido')
                continue
            match = ENV_SECRET_RE.match(line)
            if match and suspicious_env_value(match.group(2)):
                findings.append(f'{path.relative_to(ROOT)}:{number}: variable sensible con valor no vacío')
    if findings:
        print('ERROR - posibles secretos encontrados:', file=sys.stderr)
        for item in findings[:50]:
            print(item, file=sys.stderr)
        if len(findings) > 50:
            print(f'... y {len(findings)-50} más', file=sys.stderr)
        return 1
    print('OK - no se detectaron secretos evidentes en el paquete versionable.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
