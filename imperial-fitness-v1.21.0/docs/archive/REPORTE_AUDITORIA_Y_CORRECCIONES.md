# Imperial Fitness AI Ecosystem - Auditoría técnica inicial y correcciones aplicadas

## Estado inicial estimado
La aplicación estaba aproximadamente en 55%–60% de terminación para uso real con clientes. El frontend compilaba después de instalar dependencias, y el backend tenía rutas funcionales, pero el flujo crítico coach → cliente tenía un problema serio en los JSON de dieta/rutina.

## Problema crítico encontrado
El backend sanitizaba todos los strings con `html.escape(..., quote=True)`. Eso convertía las comillas de `meals_json` y `payload_json` en entidades HTML como `&quot;` o `&amp;quot;`. Como consecuencia, el frontend no podía hacer `JSON.parse()` correctamente y el cliente podía ver planes vacíos o rutinas sin días/ejercicios.

## Correcciones aplicadas
1. Se agregó sanitización especial para campos JSON en `backend/app/schemas.py`, conservando JSON válido y bloqueando etiquetas/patrones peligrosos.
2. Se separaron los modelos `DietPlanCreate` y `AssignedRoutineCreate` del sanitizado general para no romper `meals_json` ni `payload_json`.
3. Se agregó recuperación en frontend para planes antiguos que ya estuvieran guardados con entidades HTML, usando decodificación antes del `JSON.parse()`.
4. Se corrigió la vista de plan personalizado para que no muestre una rutina de otro cliente cuando el cliente actual no tenga rutina asignada.
5. Se actualizó el efecto de sincronización del plan para refrescar cuando cambian dietas existentes o clientes cargados desde API.
6. Se ajustó `bcrypt` en `backend/requirements.txt` para compatibilidad con Python moderno.
7. Se agregó una prueba backend que valida el flujo completo: entrenador asigna dieta/rutina y cliente la puede recuperar con JSON intacto.

## Pruebas ejecutadas
- Frontend: `npm run build` → correcto.
- Backend: `python -m pytest -q` → 5 pruebas correctas.

## Pendientes antes de usar con clientes reales
1. Realizar pruebas manuales end-to-end en navegador con login de entrenador y cliente.
2. Agregar edición/eliminación/versionado de dietas y rutinas.
3. Implementar refresco o notificación cuando el cliente ya está logueado y el coach asigna un nuevo plan.
4. Migrar advertencias de Pydantic v2 (`ConfigDict`) y fechas UTC modernas.
5. Revisar seguridad, backups, despliegue, variables `.env`, CORS, HTTPS y almacenamiento externo antes de producción.

## Nivel actualizado después de esta corrección
La app queda aproximadamente en 65%–70% para prueba controlada local, pero todavía no la consideraría lista para clientes reales sin una ronda de pruebas funcionales y mejoras de producto.
