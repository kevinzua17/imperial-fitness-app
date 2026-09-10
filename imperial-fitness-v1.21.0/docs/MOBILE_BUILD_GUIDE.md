# Guía para convertir Imperial Fitness en APK / iOS

Esta entrega deja el proyecto preparado para empaquetado móvil con Capacitor.

## Requisitos para Android

1. Instalar Node.js LTS.
2. Instalar Android Studio.
3. Instalar Android SDK y crear/emular un dispositivo Android.
4. En la raíz del proyecto ejecutar:

```bash
npm ci
npm run build
npm run mobile:add:android
npm run mobile:android
```

Android Studio abrirá el proyecto nativo. Desde allí se puede generar APK o AAB.

## Requisitos para iOS

Solo puede compilarse desde macOS con Xcode instalado.

```bash
npm ci
npm run build
npm run mobile:add:ios
npm run mobile:ios
```

## Variables necesarias

Antes de compilar para clientes reales, configurar `.env.production`:

```env
VITE_API_BASE_URL=https://api.tudominio.com
VITE_DEV_MODE=false
VITE_SENTRY_DSN=
```

El backend debe estar publicado con HTTPS y CORS autorizado para el dominio/app.

## Validación mínima antes de entregar a clientes

```bash
npm test
npm run build
cd backend
pytest -q
cd ..
python scripts/production_readiness_check.py
```

## Nota importante

Capacitor permite generar los proyectos `android/` e `ios/`, pero no se incluyeron carpetas nativas generadas porque dependen del SDK local de Android Studio y/o Xcode del equipo donde se compile. El código queda listo para generarlas con los comandos anteriores.
