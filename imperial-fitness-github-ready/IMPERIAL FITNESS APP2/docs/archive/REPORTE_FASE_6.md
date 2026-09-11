# REPORTE FASE 6 - Pruebas integrales, permisos y regresión

## Objetivo de la fase
Fortalecer la estabilidad del proyecto para acercarlo a una versión apta para prueba real controlada, priorizando pruebas integrales del flujo coach → cliente, permisos por rol y manejo seguro de planes activos/inactivos.

## Cambios implementados

### 1. Plan nutricional con retiro seguro
- Se agregó el campo `active` a `DietPlan`.
- Los planes retirados ya no se eliminan físicamente: quedan inactivos para proteger trazabilidad e historial.
- La vista del cliente solo recibe planes activos.
- El listado de planes del coach solo muestra planes activos.

### 2. Reemplazo correcto de dieta activa
- Cuando el coach asigna un nuevo plan nutricional a un cliente, los planes activos anteriores del mismo cliente se desactivan automáticamente.
- Esto evita que el cliente vea planes antiguos o que existan múltiples planes vigentes confundiendo la interfaz.

### 3. Migración local y producción
- SQLite local ahora agrega automáticamente la columna `active` en `diet_plans` si no existe.
- Se actualizó `backend/supabase/schema.sql`.
- Se agregó `backend/supabase/migrations/003_diet_plan_soft_delete.sql` para entornos Supabase/PostgreSQL.

### 4. Pruebas nuevas de regresión y seguridad
Se agregaron 3 pruebas backend:
- Reemplazo de plan nutricional activo.
- Retiro/soft delete de plan nutricional ocultándolo al cliente.
- Bloqueo para impedir que un entrenador gestione planes o rutinas de clientes asignados a otro entrenador.

## Validaciones ejecutadas

### Backend
```bash
python -m pytest backend/tests -q
```
Resultado: 14 pruebas pasadas.

### Frontend
```bash
npm run build
```
Resultado: compilación correcta.

```bash
npx vitest run
```
Resultado: 1 prueba pasada.

## Estado estimado después de fase 6
El proyecto queda en un estado aproximado de 95%–97% para prueba real controlada.

## Pendiente principal para fase 7
- Limpieza final de producción.
- Guía de instalación y prueba con usuarios reales.
- Revisión de variables `.env`.
- Checklist final de despliegue.
- Documentación de roles y flujo operativo para admin/coach/cliente.
