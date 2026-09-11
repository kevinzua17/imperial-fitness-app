# Hotfix - Nutrición visual con repositorio de imágenes y carga desde admin

## Objetivo
Quitar emojis de la vista de alimentación y reemplazarlos por imágenes profesionales.

## Cambios
- Se agregó `public/foods/` como repositorio visual local de alimentos.
- Se agregó `FoodImage` para mostrar imágenes de alimentos en tarjetas de cliente y admin.
- Se agregó `foodMedia.ts` para resolver imágenes por nombre/categoría.
- Admin/entrenador ahora puede asociar imagen desde la Base Nutricional Profesional:
  - pegar URL `https://...`, `/foods/...` o `/uploads/...`;
  - subir archivo de imagen;
  - guardar asociación global usando `app_settings`.
- No se agregan columnas nuevas ni migraciones.
- No se ejecuta SQL manual.

## Nota de persistencia
Las imágenes subidas desde admin usan el endpoint `/media/foods/{food_key}/image` y se guardan como configuración en `app_settings` con clave `food_image:<slug>`.
Si el backend no está disponible, la app permite previsualizar localmente en el navegador.
