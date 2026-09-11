# Hotfix ejercicios: explicaciones en español y guía de rango

Fecha: 2026-06-25

## Motivo
La integración de `free-exercise-db` aportó imágenes y más ejercicios, pero las instrucciones originales venían en inglés y las imágenes eran estáticas. Esto podía confundir al usuario porque no quedaba claro el rango de movimiento.

## Cambios aplicados

- Las explicaciones visibles de la base abierta ya no muestran instrucciones crudas en inglés.
- Cada ejercicio abierto genera una indicación técnica resumida en español según músculo, equipo y patrón de movimiento.
- La ficha visual ahora muestra una guía de rango con tres fases:
  - Inicio
  - Recorrido
  - Final
- Las fotos estáticas se etiquetan como `Guía de rango`, no como animación real.
- Se agregó una advertencia clara cuando el recurso es una foto estática.
- Se agregó ritmo sugerido por tipo de movimiento.
- Se redujo la caché del catálogo abierto a 1 día y se cambió la clave de caché para forzar que los usuarios reciban la versión nueva.
- Se incrementó el service worker a `v5` para refrescar recursos de la PWA.

## Sin cambios en infraestructura

- No se tocó Supabase.
- No se ejecutó SQL.
- No se cambiaron tablas ni políticas.
- No se movieron imágenes externas al ZIP.

## Próximo paso recomendado

Para llegar al nivel premium tipo Lyfta, reemplazar progresivamente los ejercicios más importantes por GIF/WebP animado o video MP4 propio de Imperial Fitness.
