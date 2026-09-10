# Despliegue controlado Imperial Fitness v1.21.0

## Regla crítica

Aplicar **primero la migración 036**, después desplegar backend v1.21.0. Si se invierte el orden, el ORM puede intentar leer columnas que aún no existen y el login puede responder con error de migración.

## 1. Backup

Crear backup de PostgreSQL/Supabase antes de migrar. No borrar tablas ni usuarios.

## 2. Base de datos

Ejecutar las migraciones pendientes en orden, terminando con:

`backend/supabase/migrations/036_imperial_lite_professional_v1.21.0.sql`

La 036 es aditiva: agrega `service_tier`, `experience_mode`, índices y tablas Lite/seguimiento/publicación profesional.

## 3. Render

Variables realmente obligatorias para arrancar en producción:

- `DATABASE_URL`
- `SECRET_KEY` segura y no predeterminada
- `APP_ENV=production`
- dominios HTTPS válidos en `CORS_ORIGINS`, `TRUSTED_HOSTS`, `FRONTEND_URL`, `BACKEND_URL`

Redis, SMTP, Cloudinary, Sentry y uptime se consideran capacidades opcionales: si faltan, las funciones asociadas pueden degradarse, pero no deben derribar autenticación.

Render debe usar `render.yaml` del **root de esta entrega**, no una carpeta antigua.

Comprobar:

- `/health/live`: proceso vivo + v1.21.0 + commit.
- `/health`: versión/commit.
- `/health/capabilities`: servicios opcionales.
- `/health/ready`: base, esquema y migración Lite.

Luego:

```bash
python scripts/verify_v121_deployment.py --base-url https://imperial-fitness-api.onrender.com
```

Para login real, exportar localmente credenciales de una cuenta autorizada y añadir `--login`. El script no imprime contraseña ni token.

Si el admin existente quedó bloqueado, ejecutar primero el script en modo lectura. Solo si corresponde, usar `--email ... --unlock`. No crea admins ni eleva clientes.

## 4. Vercel

- Root Directory: root de esta entrega.
- Framework: Vite.
- Build: `npm run build`.
- Output: `dist`.
- `VITE_API_BASE_URL=https://imperial-fitness-api.onrender.com`.

Tras desplegar, abrir DevTools y comprobar `window.__IMPERIAL_BUILD__`; su versión debe ser 1.21.0 y el commit debe corresponder al despliegue actual.

## 5. Smoke test funcional

1. Admin inicia sesión.
2. Abre **Coach Pro**.
3. Selecciona un cliente.
4. Confirma/solicita cuestionario inicial.
5. Genera enlace Lite.
6. Abre el enlace en incógnito/móvil.
7. Confirma que la URL se limpia a `/lite` y que no aparece el token en navegación posterior.
8. Envía check-in sin peso (debe permitirse).
9. Envía check-in con dolor alto en cuenta de prueba y verifica prioridad crítica.
10. Valida un entrenamiento/alimentación.
11. Revisa manualmente las advertencias antes de aprobar.
12. Publica y descarga PDF.
13. En Lite, verifica que se vea la versión publicada.
14. Revoca el link; la sesión derivada debe dejar de funcionar.
15. Cambia un cliente entre Lite/Híbrido/Premium y verifica su navegación.

## 6. Rollback

Si el frontend falla, Vercel puede volver al deployment anterior mientras se mantiene el backend compatible.

Si el backend falla tras deploy, volver al release anterior. La migración 036 puede permanecer: es aditiva y no obliga a borrar datos. No ejecutar `DROP` como parte del rollback.

## 7. CI antes de promover

```bash
python scripts/secret_scan.py
python scripts/production_readiness_check.py
python scripts/prelaunch_guard_v121.py
python -m pytest backend/tests -q
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run test
npm run build
```

No promover a producción si cualquiera de estas pruebas falla en GitHub Actions.
