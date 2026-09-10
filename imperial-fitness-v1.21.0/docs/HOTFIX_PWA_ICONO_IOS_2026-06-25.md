# Hotfix PWA iOS: icono superpuesto

## Problema

En iOS, al instalar la PWA desde Safari, el icono podía verse como una imagen superpuesta o con capas blancas detrás. En Android se veía correctamente.

## Causa probable

El `apple-touch-icon` anterior tenía transparencia y esquinas preredondeadas dentro del propio PNG. iOS aplica su propia máscara y redondeo al icono; cuando el PNG ya trae transparencia/redondeo, puede renderizarlo de forma poco limpia o mantener una versión en caché.

## Corrección aplicada

- Se regeneraron los iconos PWA como PNG opacos RGB, sin canal alfa.
- Se eliminó el redondeo interno del icono; iOS/Android aplican su propia máscara.
- Se agregó un icono específico para iOS: `/icons/apple-touch-icon-imperial-fitness.png`.
- Se agregaron variantes Apple Touch de 120, 152, 167 y 180 px.
- Se separaron iconos normales (`purpose: any`) e iconos Android adaptativos (`purpose: maskable`).
- Se actualizó la versión del service worker de `v3` a `v4` para refrescar caché.

## Archivos modificados

- `public/icons/*.png`
- `public/manifest.webmanifest`
- `public/service-worker.js`
- `index.html`
- `scripts/generar_iconos_pwa.py`
- `scripts/convertir_logo_pwa.py`
- `public/icons/README.md`

## Instrucción para iPhone ya instalado

Si el usuario ya tenía la PWA instalada, debe eliminar el icono anterior y volver a instalar desde Safari:

1. Mantener presionado el icono anterior.
2. Eliminar de la pantalla de inicio.
3. Abrir Safari.
4. Entrar a la URL de la app.
5. Compartir → Agregar a pantalla de inicio.

No se tocó Supabase ni se ejecutó SQL.
