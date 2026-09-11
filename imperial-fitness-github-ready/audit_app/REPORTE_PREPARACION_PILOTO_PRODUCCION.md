# Reporte de preparación para piloto de producción

## Resumen

El proyecto fue actualizado con una carpeta de despliegue piloto para poder pasar de entorno local a una prueba real con usuarios del gym.

## Archivos agregados

- `deploy/pilot/README_PILOTO_PRODUCCION.md`
- `deploy/pilot/render.env.example`
- `deploy/pilot/vercel.env.example`
- `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`
- `deploy/pilot/SUPABASE_PASO_A_PASO.md`
- `deploy/pilot/CLOUDINARY_PASO_A_PASO.md`
- `deploy/pilot/REDIS_UPSTASH_PASO_A_PASO.md`
- `deploy/pilot/SMTP_PASO_A_PASO.md`
- `deploy/pilot/RENDER_BACKEND_PASO_A_PASO.md`
- `deploy/pilot/VERCEL_FRONTEND_PASO_A_PASO.md`
- `deploy/pilot/APK_ANDROID_PASO_A_PASO.md`
- `deploy/pilot/CHECKLIST_PILOTO_10_20_USUARIOS.md`
- `deploy/pilot/GENERAR_SECRET_KEY_WINDOWS.bat`
- `deploy/pilot/VERIFICAR_BACKEND_WINDOWS.bat`
- `deploy/pilot/COMANDOS_APK_ANDROID_WINDOWS.bat`
- `deploy/pilot/COMPROBAR_BUILD_LOCAL_WINDOWS.bat`
- `deploy/pilot/COMPROBAR_BACKEND_LOCAL_WINDOWS.bat`
- `.env.pilot.example`
- `backend/.env.pilot.example`
- `docs/PLAN_PILOTO_PRODUCCION_IMPERIAL_FITNESS.md`

## Estado técnico

La app ya tiene guía y plantillas para:

- Base de datos PostgreSQL/Supabase.
- Redis/Upstash.
- Cloudinary.
- SMTP.
- Backend FastAPI en Render/Railway.
- Frontend React/Vite en Vercel/Netlify.
- APK Android con Capacitor.

## Qué falta fuera del código

Falta crear las cuentas externas y pegar las claves reales en los paneles de despliegue.

No se incluyen claves reales por seguridad.
