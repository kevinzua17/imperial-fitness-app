# Imperial Fitness - Entrega Completa

Este proyecto contiene la base completa para convertir Imperial Fitness en una plataforma web y app conectada.

## Contenido

- Frontend web en React + Vite + Tailwind.
- Backend Python con FastAPI.
- CI/CD con GitHub Actions.
- Dockerfile y docker-compose.
- Sentry preparado para frontend/backend.
- Health checks para UptimeRobot.
- Runbook DevOps en `docs/DEVOPS_RUNBOOK.md`.
- Base nutricional ampliada.
- Base de rutinas por objetivo.
- Modulos para clientes, entrenadores, administrador, fotos de progreso, recompensas y sincronizacion.

## Como crear el ZIP

En Windows, haz doble clic en:

```text
CREAR_ZIP_WINDOWS.bat
```

O ejecuta:

```bash
python crear_zip_entrega.py
```

Se generara:

```text
imperial-fitness-entrega-completa.zip
```

## Como iniciar el backend local

En Windows, haz doble clic en:

```text
INICIAR_BACKEND_WINDOWS.bat
```

Luego abre:

```text
http://localhost:8000/docs
```

## Como iniciar la web local

En otra ventana, haz doble clic en:

```text
INICIAR_WEB_WINDOWS.bat
```

Luego abre la URL que muestre Vite, normalmente:

```text
http://localhost:5173
```

## Logo real

La aplicacion apunta al archivo:

```text
public/logo-imperial-fitness.png
```

Para que se vea exactamente el logo real, guarda ahi la imagen original con ese nombre.

## Estado actual

El frontend ya consume la API Python para autenticacion, usuarios, dietas, rutinas asignadas, progreso, comunidad, retos, recompensas, finanzas y branding.

Para beta privada, los siguientes pasos son configurar PostgreSQL en Supabase, Cloudinary para imagenes, Render para backend y Vercel para frontend.

## Fase 7 - Preparación de producción y beta privada

Esta entrega agrega una capa de cierre operativo para que el proyecto pueda pasar de desarrollo local a prueba controlada:

- Variables de entorno separadas para frontend y backend.
- Checklist de beta privada en `docs/QA_BETA_PRIVADA.md`.
- Verificación automática de paquete en `scripts/production_readiness_check.py`.
- Validación de seguridad mínima: CORS sin comodines, HSTS en producción, storage externo, Redis para rate limit distribuido y SMTP real.
- Pruebas backend/frontend como condición previa antes de entregar a clientes.

## Checklist final antes de clientes reales

1. Configurar Supabase/PostgreSQL y aplicar migraciones en `backend/supabase/migrations`.
2. Configurar Cloudinary o storage externo.
3. Configurar SMTP real para recuperación de cuenta.
4. Configurar `SECRET_KEY` larga y única.
5. Configurar `CORS_ORIGINS` y `TRUSTED_HOSTS` con dominios definitivos.
6. Ejecutar `pytest -q` dentro de `backend`.
7. Ejecutar `npm run build` y `npm test` en frontend.
8. Ejecutar `python scripts/production_readiness_check.py`.
9. Hacer prueba manual según `docs/QA_BETA_PRIVADA.md`.

## Comando de validación de entrega

```bash
python scripts/production_readiness_check.py
```


## Fase 10.1 - Preparación móvil real

Esta versión agrega preparación formal para llevar la plataforma web/PWA a aplicación móvil instalable como APK Android y proyecto iOS:

- Configuración base de Capacitor en `capacitor.config.ts`.
- Scripts NPM para generar/sincronizar proyectos Android e iOS.
- Iconos PWA reales en `public/icons/`.
- Enlace `apple-touch-icon` corregido para instalación en iPhone/iPad.
- Guía de compilación móvil en `docs/MOBILE_BUILD_GUIDE.md`.

### Scripts móviles disponibles

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:build
npm run mobile:android
npm run mobile:ios
```

Para Android se requiere Android Studio. Para iOS se requiere macOS con Xcode.

---

## Actualización: preparación de piloto de producción

Se agregó una carpeta nueva para llevar la app a un piloto real:

```txt
deploy/pilot/
```

Leer primero:

```txt
deploy/pilot/README_PILOTO_PRODUCCION.md
```

Orden recomendado:

1. Supabase.
2. Cloudinary.
3. Redis / Upstash.
4. SMTP.
5. Backend en Render/Railway.
6. Frontend en Vercel/Netlify.
7. APK Android con Capacitor.
8. Prueba con 10 a 20 usuarios.

También se agregó:

```txt
docs/PLAN_PILOTO_PRODUCCION_IMPERIAL_FITNESS.md
```
