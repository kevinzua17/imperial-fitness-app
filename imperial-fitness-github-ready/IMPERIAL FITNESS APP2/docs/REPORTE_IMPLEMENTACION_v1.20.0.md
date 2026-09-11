# Imperial Fitness v1.20.0 — reporte de implementación

**Fecha de preparación:** 5 de agosto de 2026  
**Lanzamiento previsto:** 6 de agosto de 2026  
**Rama de trabajo:** `hardening-v1.20.0`

## Resultado

La versión 1.20.0 corrige los riesgos principales identificados en la auditoría de v1.19.1 sin sustituir el sistema de autenticación ni modificar contraseñas, tokens, correos, roles o cuentas existentes. La migración 034 es aditiva: agrega columnas, índices y restricciones para datos nuevos, pero no elimina tablas ni columnas.

La calificación objetivo de 9.8/10 queda condicionada a completar el despliegue real, ejecutar la migración en Supabase, confirmar variables y dominios en Render/Vercel/Cloudinary, aprobar el build de Vercel y superar pruebas de carga. El código por sí solo no demuestra la capacidad real de los planes contratados ni del entorno de producción.

## Cambios implementados

### Motor nutricional v2

- Un único motor de cálculo en backend: `backend/app/core/nutrition_engine.py`.
- El cálculo se bloquea cuando faltan peso, estatura, edad, sexo, objetivo o actividad suficiente.
- Se eliminaron valores corporales ficticios de la interfaz y de la generación.
- La TMB de InBody tiene prioridad únicamente cuando la medición está identificada como `inbody`.
- Si no existe una TMB InBody confirmada, se utiliza Mifflin–St Jeor y se registra la fuente.
- El nivel de actividad puede seleccionarse o derivarse de entrenamientos, pasos y actividad laboral.
- No se genera automáticamente una dieta para menores de 18 años.
- Cada resultado conserva fórmula, fuente de TMB, factor de actividad, calorías de mantenimiento, ajuste por objetivo, macros y fecha de cálculo.
- La publicación exige que las comidas queden dentro de ±5 % de la meta calórica, que proteína esté dentro de ±15 %, carbohidratos y grasas dentro de ±20 %, y que representen un día completo.
- Un nuevo InBody no sobrescribe la dieta que ya ve el cliente.
- Los cambios de entrenador se guardan como borrador; la dieta activa solo cambia mediante aprobación y publicación.
- Se conserva historial de versiones y relación con el plan reemplazado.

### Dieta y experiencia visual

- Se retiraron imágenes decorativas de la vista principal del plan del cliente.
- La pantalla prioriza meta calórica, macros, alimentos, gramos, total por comida y total diario.
- Los datos inexistentes se muestran como “Sin dato”; no se completan con valores supuestos.
- La edición de un plan publicado crea una nueva versión en borrador.
- Las sustituciones realizadas por el cliente siguen disponibles, pero se validan contra el total calórico.

### Biblioteca de ejercicios

- Acceso de solo lectura para clientes.
- Administración completa para entrenador y administrador.
- Filtros por segmento, músculo, fuente y búsqueda.
- Mapa corporal SVG frontal/posterior con zonas pulsables y botones accesibles por grupo muscular.
- Carga progresiva; se eliminó el límite fijo de 120 tarjetas visibles.
- Separación entre:
  - visible para el cliente;
  - activo;
  - aprobado;
  - elegible para rutinas automáticas.
- La base abierta queda restringida al equipo profesional para revisión e importación; el cliente solo recibe ejercicios persistidos, visibles y aprobados por la API.
- Las consultas repetidas del catálogo se almacenan temporalmente en caché por rol y filtros, con invalidación al crear o editar ejercicios. Si Redis falla, las solicitudes degradan a memoria local sin devolver 500, mientras readiness impide abrir tráfico masivo hasta recuperar el servicio distribuido.

### Infraestructura y seguridad

- Readiness comprueba las columnas del motor nutricional y de ejercicios, RLS en cinco tablas sensibles y Redis distribuido cuando está configurado; responde 503 cuando producción no está lista.
- Render preparado con dos workers, concurrencia limitada y pool de base de datos contenido.
- Vercel incluye CSP, HSTS, COOP y caché inmutable para recursos versionados.
- Configuración de producción rechaza dominios de ejemplo y URLs sin HTTPS.
- Se añadieron diagnósticos SQL de migración y RLS/rol de conexión, verificador de despliegue y prueba de carga de solo lectura.
- El diagnóstico usa acceso dinámico a columnas, por lo que puede ejecutarse antes y después de la migración 034 sin depender de que el esquema nuevo ya exista.
- Cloudinary conserva originales y recursos privados; las imágenes públicas nuevas se entregan con formato/calidad automáticos y límite de ancho según su uso, sin borrar activos existentes.
- No se modificaron los módulos de inicio de sesión, hash de contraseña, recuperación ni refresh tokens.

## Archivos principales

- `backend/app/core/nutrition_engine.py`
- `backend/app/core/nutrition.py`
- `backend/app/routers/nutrition.py`
- `backend/app/routers/progress.py`
- `backend/app/routers/exercises.py`
- `backend/supabase/migrations/034_nutrition_exercise_launch_hardening.sql`
- `backend/supabase/diagnostics/VERIFICAR_MIGRACION_034_v1.20.0.sql`
- `backend/supabase/diagnostics/VERIFICAR_RLS_Y_ROL_API_v1.20.0.sql`
- `src/components/PersonalPlanView.tsx`
- `src/components/ExerciseLibraryView.tsx`
- `scripts/prelaunch_guard_v120.py`
- `scripts/verify_v120_deployment.py`
- `scripts/load_test_500_readonly.py`

## Validaciones ejecutadas en la copia aislada

- 31 pruebas independientes de nutrición, macros, totales, relaciones ORM, Cloudinary, resiliencia Redis, flujo borrador/publicación y seguridad de migración: aprobadas.
- Compilación sintáctica de módulos Python: aprobada.
- Transpilación sintáctica de los 94 archivos TypeScript/TSX del frontend: aprobada.
- Escaneo de secretos: aprobado.
- Comprobación de preparación de producción: aprobada.
- Compatibilidad de creación de esquema SQLite y conservación de `password_hash`: aprobada.

## Limitaciones de la validación local

- El entorno de trabajo no permitió completar una instalación limpia de npm porque el registro de paquetes disponible no entregó una dependencia transitiva. Por ello, el build definitivo debe aprobarse en Vercel antes del cambio de tráfico.
- La suite integral de FastAPI no pudo cargarse en este entorno por una dependencia Python ausente; sí se ejecutaron las pruebas puras nuevas y las comprobaciones de sintaxis.
- No se tuvo acceso a los paneles reales de Supabase, Render, Vercel o Cloudinary ni a sus métricas y planes contratados.
- No se ejecutó ninguna escritura contra la base de producción.

## Criterio de salida

No abrir el acceso a los 500 usuarios hasta que todos los puntos marcados como **bloqueantes** en `CHECKLIST_LANZAMIENTO_500_v1.20.0.md` estén aprobados. El despliegue debe ser gradual: equipo interno, 10 usuarios, 50, 150 y finalmente 500.
