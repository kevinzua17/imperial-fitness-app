# Imperial Fitness DevOps Runbook

## CI/CD

GitHub Actions:

- `.github/workflows/ci.yml`: build frontend, tests backend, docker build smoke.
- `.github/workflows/deploy-hooks.yml`: dispara deploy hooks de Render y Vercel manualmente.

Secrets recomendados:

```text
RENDER_DEPLOY_HOOK_URL
VERCEL_DEPLOY_HOOK_URL
```

## Docker

Local completo:

```bash
docker compose up --build
```

Servicios:

- Web: http://localhost:8080
- API: http://localhost:8000/docs
- Postgres: localhost:5432

## Monitoreo

Sentry:

Backend:

```env
SENTRY_DSN=...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Frontend:

```env
VITE_SENTRY_DSN=...
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

UptimeRobot:

Monitorear:

```text
GET https://TU_API_RENDER.onrender.com/health/live
GET https://TU_API_RENDER.onrender.com/health/ready
GET https://imperialfitnesgym.com.co
```

Prometheus metrics:

```text
GET /metrics
```

Platform hardening adicional:

```text
docs/PLATFORM_HARDENING.md
```

## Logs

Render logs quedan en Render Dashboard.

Para BetterStack:

1. Crear source en BetterStack.
2. Guardar token en `BETTERSTACK_SOURCE_TOKEN`.
3. En primera fase usar logs JSON por stdout.
4. Configurar Render log drain si el plan lo permite.

## Backups

PostgreSQL:

```bash
DATABASE_URL="postgresql://..." ./scripts/backup_postgres.sh
```

Cloudinary:

Ver `scripts/backup_cloudinary.md`.

## Async jobs

Worker RQ:

```bash
cd backend
python -m app.jobs.worker
```

Variables:

```env
ASYNC_JOBS_ENABLED=true
REDIS_URL=redis://...
RQ_QUEUE_NAME=imperial-default
```

Actualmente se usa para enviar emails de recuperacion si Redis esta disponible.

## Multi-env

Archivos base:

```text
backend/.env.development.example
backend/.env.staging.example
backend/.env.production.example
```

## Orden recomendado de release

1. Merge a main.
2. CI verde.
3. Deploy backend Render.
4. Ejecutar smoke test `/health/ready`.
5. Deploy frontend Vercel.
6. Probar login, upload y dashboard.
7. Crear tag `v1.9.x`.
## Rollback

Si una entrega falla durante beta privada:

1. Restaurar el último tag estable del frontend en Vercel.
2. Restaurar el último deploy estable del backend en Render.
3. Verificar `/health/live` y `/health/ready`.
4. Revisar logs de autenticación, dietas, rutinas y SyncHub.
5. Si el error afecta datos, detener nuevas asignaciones y restaurar backup PostgreSQL más reciente.
6. Documentar incidente, causa, alcance y corrección antes de volver a desplegar.
