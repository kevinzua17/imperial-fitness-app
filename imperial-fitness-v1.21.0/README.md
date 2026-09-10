# Imperial Fitness v1.21.0

Plataforma de entrenamiento y seguimiento con tres experiencias sobre el mismo backend y la misma base de datos:

- **Imperial Fitness Pro**: centro de operaciones para administrador/coach.
- **Imperial Fitness Lite**: portal ultraligero por enlace para semipersonalizados, sin instalar la app.
- **Imperial Fitness Premium/PWA**: experiencia completa con los módulos sociales, progreso, retos y demás funciones existentes.

## Cambios clave de v1.21.0

- Inicio de producción más resiliente: Redis, SMTP, Cloudinary y uptime son capacidades opcionales y no derriban el login si no están disponibles.
- `/health`, `/health/live`, `/health/ready` y `/health/capabilities` permiten distinguir proceso vivo, base lista, migraciones y servicios opcionales.
- Identificación de versión y commit de build en backend y frontend.
- Migración `036_imperial_lite_professional_v1.21.0.sql` para Lite, check-ins, encuestas y publicaciones versionadas.
- Magic links opacos con token almacenado como hash, fragmento URL, intercambio por POST, sesión Lite independiente, vencimiento y revocación.
- Cuestionario inicial de salud/nutrición y check-in breve con peso opcional, adherencia, sueño, energía, estrés y dolor.
- Publicación profesional: validar → revisar advertencias → aprobar → congelar versión → entregar por Lite/PDF.
- Panel Coach Pro con priorización de dolor alto, adherencia baja, check-in vencido, evolución, cribado pendiente y planes faltantes/antiguos.
- Separación de carga: `/lite` importa únicamente el portal ligero; la aplicación Pro/Premium se carga aparte.
- Lógica de imágenes de alimentos extraída de `PersonalPlanView` a un hook dedicado para reducir acoplamiento.
- CI real para seguridad, guardias de release, backend tests, typecheck, frontend tests y build.

## Orden correcto de despliegue

**No despliegues el backend v1.21.0 antes de aplicar la migración 036.** El modelo `users` ya espera `service_tier` y `experience_mode`.

1. Haz backup de Supabase/PostgreSQL.
2. Ejecuta las migraciones pendientes hasta `backend/supabase/migrations/036_imperial_lite_professional_v1.21.0.sql`.
3. Verifica las variables obligatorias `DATABASE_URL` y `SECRET_KEY` en Render.
4. Despliega el backend y comprueba `/health/live`, `/health`, `/health/capabilities` y `/health/ready`.
5. Ejecuta `python scripts/verify_v121_deployment.py --base-url https://imperial-fitness-api.onrender.com`.
6. Para prueba real de login, configura `IMPERIAL_LOGIN_EMAIL` e `IMPERIAL_LOGIN_PASSWORD` localmente y ejecuta el verificador con `--login`.
7. Despliega el frontend en Vercel con `VITE_API_BASE_URL=https://imperial-fitness-api.onrender.com`.
8. Prueba el flujo completo admin → enlace Lite → check-in → publicación → PDF.

Consulta `DESPLIEGUE_IMPERIAL_FITNESS_v1.21.0.md` para el procedimiento operativo y rollback.

## Ejecución local

Frontend:

```bash
npm ci --legacy-peer-deps
cp .env.example .env
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Verificación de release

```bash
python scripts/secret_scan.py
python scripts/production_readiness_check.py
python scripts/prelaunch_guard_v121.py
python -m pytest backend/tests -q
npm run typecheck
npm run test
npm run build
```

En GitHub, `.github/workflows/ci.yml` ejecuta estas verificaciones automáticamente con dependencias limpias.

## Recuperación segura de acceso admin

`scripts/recover_admin_access.py` inspecciona administradores existentes. Con `--unlock` solo reactiva/desbloquea **un administrador ya existente**; no eleva roles ni cambia contraseñas.

## Seguridad Lite

El enlace público usa `#token=...` para que el token no viaje al servidor del frontend. El navegador limpia la URL antes de intercambiarlo por una sesión Lite. El backend almacena hashes, no tokens en claro; la sesión Lite no es un JWT de la app completa y solo autoriza rutas Lite. Revocar el enlace revoca también las sesiones derivadas.
