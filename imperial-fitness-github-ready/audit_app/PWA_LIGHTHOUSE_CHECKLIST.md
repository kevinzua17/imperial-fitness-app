# Imperial Fitness - Checklist PWA y QR

## 1. Logo real

Guarda el logo real en:

```text
public/logo-imperial-fitness.png
```

Genera iconos:

```powershell
python -m pip install pillow
python generar_iconos_pwa.py
```

Debe crear:

```text
public/icons/icon-192.png
public/icons/icon-512.png
```

## 2. Build local

```powershell
npm run build
```

## 3. Verificar PWA con Lighthouse

1. Abre Chrome.
2. Abre la web publicada en HTTPS.
3. Presiona F12.
4. Pestaña Lighthouse.
5. Marca Progressive Web App.
6. Generate report.

Objetivo:

```text
Installable: OK
Manifest: OK
Service Worker: OK
HTTPS: OK
```

## 4. Instalar desde QR sin Play Store

Cuando la web este en:

```text
https://imperialfitnesgym.com.co
```

crea un QR con esa URL.

Android:

```text
Chrome > abrir URL > menu > Agregar a pantalla de inicio
```

iPhone:

```text
Safari > abrir URL > compartir > Agregar a pantalla de inicio
```

## 5. Requisitos para que instale

- Debe estar en HTTPS.
- Debe tener `manifest.webmanifest` valido.
- Debe tener `service-worker.js` registrado.
- Debe tener iconos 192 y 512.
- No debe bloquear scripts por CORS.