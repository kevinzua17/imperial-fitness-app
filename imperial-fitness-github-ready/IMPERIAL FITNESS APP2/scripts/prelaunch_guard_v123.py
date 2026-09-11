"""Guardia estática del hotfix de sesión v1.20.3."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = Path('/mnt/data/if_v123_work/IMPERIAL FITNESS v1.20.2')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'ERROR: {message}')


package = json.loads(read('package.json'))
require(package.get('version') == '1.20.3', 'package.json no está en v1.20.3')
require('APP_VERSION = "1.20.3"' in read('backend/app/main.py'), 'backend no reporta v1.20.3')

api = read('src/services/api.ts')
storage = read('src/utils/safeStorage.ts')
app = read('src/App.tsx')

require("SESSION_ACCESS_TOKEN_KEY = 'imperial_session_access_token_v123'" in api, 'falta llave de sesión temporal')
require('safeSessionSetItem(SESSION_ACCESS_TOKEN_KEY, token)' in api, 'el access token no se conserva en sessionStorage')
require('safeSessionGetItem(SESSION_ACCESS_TOKEN_KEY)' in api, 'el access token no se restaura después de F5')
require('safeSessionRemoveItem(SESSION_ACCESS_TOKEN_KEY)' in api, 'logout no limpia el token temporal')
require('window.sessionStorage' in storage, 'faltan utilidades seguras de sessionStorage')
require("setActiveTab(previous => isTabAllowed(previous, apiUser.role) ? previous : 'dashboard')" in app, 'login no conserva el módulo válido')
require("url.searchParams.set('tab', activeTab)" in app, 'el módulo no se conserva en la URL')
require("safeSetItem(LAST_ACTIVE_TAB_KEY, activeTab)" in app, 'el módulo no se conserva localmente')

# El hotfix de frontend no debe modificar autenticación, hashes ni recuperación del backend.
critical = [
    'backend/app/routers/auth.py',
    'backend/app/security.py',
    'backend/app/deps.py',
    'backend/app/routers/recovery.py',
]
for relative in critical:
    current = ROOT / relative
    previous = ORIGINAL / relative
    require(previous.exists(), f'no se encontró referencia original para {relative}')
    require(digest(current) == digest(previous), f'se modificó un archivo crítico de autenticación: {relative}')

print('OK - v1.20.3 conserva sesión en F5, mantiene el módulo y no modifica autenticación del backend.')
