# Hotfix - Restaurar sustitución de alimentos para cliente

Fecha: 2026-06-25

## Problema

Después de la mejora visual de nutrición, el botón de sustitución quedó visible solo para roles admin/entrenador. Esto impedía que el cliente cambiara un alimento de su dieta cuando no lo tenía disponible o no quería consumirlo ese día.

## Corrección

- Se restauró la opción de sustitución para el cliente en cada alimento del plan.
- Para admin/entrenador el botón sigue mostrando `Sustituir alimento`.
- Para cliente el botón muestra `Cambiar por equivalente`.
- Se conserva el cálculo de equivalencia nutricional por grupo compatible.
- Se mantiene el guardado del cambio en el plan activo del cliente cuando el plan tiene ID persistente.
- Se mantiene la vista visual con imágenes y macros resumidos.
- Se eliminó el emoji visible del encabezado de plan de alimentación para mantener una presentación más profesional.
- Se actualizó el service worker a v10 para ayudar a refrescar la PWA.

## Alcance

No se tocó Supabase. No se ejecutó SQL. No se cambiaron tablas ni políticas. El cambio es de frontend y usa los endpoints existentes para persistir las sustituciones.

## Validación ejecutada

- `python -m py_compile backend/app/main.py backend/app/database.py backend/app/routers/auth.py`
- `python scripts/secret_scan.py .`
- `python scripts/production_readiness_check.py .`
