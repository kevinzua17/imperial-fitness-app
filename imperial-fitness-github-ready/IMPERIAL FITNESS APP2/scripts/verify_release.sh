#!/usr/bin/env bash
set -euo pipefail

printf 'Verificando limpieza del paquete...\n'
if find . -type d \( -name .git -o -name node_modules -o -name dist -o -name __pycache__ -o -name .pytest_cache \) | grep -q .; then
  echo 'ERROR: existen carpetas generadas o privadas.'
  find . -type d \( -name .git -o -name node_modules -o -name dist -o -name __pycache__ -o -name .pytest_cache \)
  exit 1
fi
if find . -type f \( -name '*.pyc' -o -name '*.db' -o -name '.env' -o -name '*.log' \) | grep -q .; then
  echo 'ERROR: existen archivos generados, bases locales o secretos locales.'
  find . -type f \( -name '*.pyc' -o -name '*.db' -o -name '.env' -o -name '*.log' \)
  exit 1
fi

printf 'Verificando backend...\n'
python -m pytest backend/tests -q

printf 'Verificando frontend...\n'
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run test
npm run build

printf 'OK - release verificado.\n'
