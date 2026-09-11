# Imperial Fitness — Readiness 96%

## Estado de esta entrega

Esta entrega eleva el proyecto a un estado de **96% de preparación técnica para piloto productivo controlado** en GitHub + Render + Vercel. El 4% restante corresponde a validación en infraestructura real: dominios definitivos, variables reales de Render/Vercel, Supabase productivo, Cloudinary productivo, SMTP real y prueba de humo posterior al despliegue.

## Validaciones ejecutadas

- Backend: **39 pruebas pasadas** con `pytest -q`.
- Readiness de paquete: `python scripts/production_readiness_check.py`.
- Escaneo local de secretos evidentes: `python scripts/secret_scan.py`.
- Compilación sintáctica backend: `python -m compileall -q backend/app`.

> Nota honesta: las pruebas frontend (`npm ci`, `npm run typecheck`, `npm run test`, `npm run build`) deben ejecutarse en GitHub Actions, Vercel o una máquina con acceso completo a npm. En este entorno no se descarga npm de forma confiable, por eso la validación frontend se dejó automatizada y documentada, pero no se declara ejecutada localmente.

## Mejoras incluidas para llegar al 96%

### Seguridad

- Access token manejado en memoria y no como token persistente en `localStorage`.
- Refresh token por cookie `HttpOnly`.
- CSP endurecido con `script-src 'self'`.
- Decodificación HTML segura en servicios críticos sin usar `innerHTML`.
- Utilidad `safeStorage` para evitar caídas en Safari privado, navegadores endurecidos o errores de cuota.
- Fotos de progreso privadas con URLs firmadas temporales.
- Cabeceras de seguridad verificadas por prueba automatizada.
- Escaneo de secretos evidentes con `scripts/secret_scan.py`.

### Backend/API

- Migración de configuración Pydantic a `SettingsConfigDict`.
- Migración de modelos de salida a `ConfigDict(from_attributes=True)`.
- Reemplazo interno de `datetime.utcnow()` por helper `utcnow()` compatible con Python moderno.
- Nuevas pruebas de seguridad operativa: headers, cookie `HttpOnly`, métricas, fotos privadas y token firmado.
- Backend validado con **39 pruebas**.

### Frontend

- Nuevas utilidades `src/utils/safeStorage.ts` y `src/utils/html.ts`.
- Nuevas pruebas frontend unitarias para token handling, almacenamiento seguro y decodificación HTML.
- Menos riesgo de caídas por `localStorage` bloqueado.
- Menos superficie de XSS por eliminación de `innerHTML` en servicios de nutrición/rutinas.

### DevOps y entrega

- `.vercelignore` para evitar que Vercel suba backend, docs históricas, uploads y archivos sensibles.
- `.renderignore` para evitar basura de frontend, builds, cachés y archivos locales.
- `quality:release` y `verify:release` agregados a `package.json`.
- CI listo para backend, frontend, Docker y verificación de paquete.
- Documentación histórica organizada en `docs/archive`.

## Comandos clave

### Backend local

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

### Frontend local

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run test
npm run build
```

### Calidad release

```bash
python scripts/secret_scan.py
python scripts/production_readiness_check.py
```

### Despliegue Render

1. Subir el ZIP a GitHub.
2. Conectar Render al repositorio.
3. Usar `render.yaml`.
4. Configurar variables reales: `DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`, `CLOUDINARY_URL`, `SMTP_*`, `UPTIME_CHECK_TOKEN`.
5. Verificar `/health/ready`.

### Despliegue Vercel

1. Conectar Vercel al mismo repositorio.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output: `dist`.
5. Variable obligatoria:

```bash
VITE_API_BASE_URL=https://TU-BACKEND.onrender.com
```

## Por qué queda en 96% y no 100%

No se declara 100% porque todavía falta validar en infraestructura real:

- Dominio real de Vercel.
- Dominio real de Render.
- Supabase real con migraciones aplicadas.
- Cloudinary real para producción.
- SMTP real para recuperación de contraseña.
- Prueba final de login, refresh cookie, fotos privadas, membresías y reportes desde URL pública.

Cuando esos puntos queden ejecutados en producción real, el proyecto puede pasar de **96% a 100% operativo**.
