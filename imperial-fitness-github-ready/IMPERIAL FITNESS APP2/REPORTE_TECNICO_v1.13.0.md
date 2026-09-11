# Imperial Fitness v1.13.0 — Seguimiento integrado del cliente

## Objetivo de la actualización

Esta versión integra las funciones de seguimiento que antes operaban de forma aislada: fotos de progreso, mediciones corporales, Camino Imperial, registros de entrenamiento y plan nutricional. También corrige el bloqueo de sustituciones de alimentos cuando el menú ya alcanzaba el límite calórico.

## Cambios implementados

### 1. Fotos de progreso para clientes

- El rol `client` conserva permiso para cargar exclusivamente sus propias fotografías.
- Al abrir el formulario, el peso y el porcentaje de grasa corporal se completan con la medición corporal más reciente.
- Si el navegador no envía esos valores, el backend utiliza la última medición registrada como respaldo.
- Las fotografías anteriores mantienen sus valores históricos; una medición nueva no modifica fotos antiguas.
- Se muestran al cliente mensajes de error más claros ante archivos no compatibles, falta de permiso o problemas de carga.

### 2. Camino Imperial con historial mensual

- Se agregaron filtros de calendario: **Este mes** y **Mes pasado**.
- Se mantienen los filtros móviles de 7, 30, 90, 180 y 365 días.
- El tablero muestra días únicos con entrenamiento, agua, nutrición y sueño dentro del periodo seleccionado.
- Las metas y hábitos siguen guardándose en `user_habits` y `habit_completions`.
- El check-in diario de entrenamiento y nutrición ahora se sincroniza con los hábitos correspondientes, evitando que la información quede separada entre módulos.
- Al abrir Camino Imperial se recuperan también los check-ins históricos existentes para que los filtros mensuales no comiencen únicamente desde esta versión.

### 3. Registros reales de ejercicios

- Cada ejercicio de la rutina contiene la opción **Registrar ejercicio realizado**.
- Se guardan peso, repeticiones, número de serie, RIR y observaciones.
- El backend almacena los datos en `workout_set_logs` y genera una recomendación de progresión.
- En cada ejercicio se muestran los tres registros más recientes guardados para ese cliente.
- El cliente registra sus propias series; el administrador o entrenador puede registrar las del cliente seleccionado según sus permisos.

### 4. Sincronización del seguimiento corporal

Al crear o editar la medición corporal más reciente:

- Se actualizan el peso, la masa muscular y la grasa corporal actuales del usuario.
- La sección **Biometría actual** de Mi Plan consulta la última medición guardada.
- El formulario de fotos utiliza los mismos datos.
- Si existe una dieta activa, se recalculan calorías y macronutrientes según peso, talla, edad, sexo, grasa corporal y objetivo.
- Las porciones del menú se ajustan proporcionalmente al nuevo objetivo energético.
- Se registra un evento de sincronización para trazabilidad.

Las mediciones antiguas pueden editarse sin alterar la biometría actual ni recalcular la dieta, salvo que pasen a ser la medición más reciente.

### 5. Sustitución de proteínas y otros alimentos

- La sustitución ya no se bloquea cuando el resto del menú consume todas las calorías disponibles.
- El sistema calcula primero una cantidad equivalente según el macronutriente principal.
- Si la sustitución supera el objetivo diario, equilibra automáticamente las demás porciones y, como último recurso, ajusta proporcionalmente todo el menú.
- El total resultante queda dentro del objetivo calórico.
- El cliente puede guardar el cambio en su plan activo mediante la ruta de titular del plan.
- Administradores y entrenadores pueden guardar la sustitución desde la edición del plan.
- Solo se muestran alimentos compatibles por grupo nutricional.

## Archivos principales modificados

- `backend/app/routers/progress.py`
- `backend/app/routers/gamification.py`
- `backend/app/services/gamification_engine.py`
- `src/components/ProgressPhotosView.tsx`
- `src/components/GamificationPanel.tsx`
- `src/components/PersonalPlanView.tsx`
- `src/services/gamificationService.ts`
- `backend/app/main.py`
- `package.json`
- `package-lock.json`

## Base de datos

No se requiere una migración nueva. La actualización utiliza tablas ya existentes:

- `progress_photos`
- `body_metrics`
- `diet_plans`
- `user_habits`
- `habit_completions`
- `daily_checkins`
- `workout_set_logs`
- `sync_events`

Antes de desplegar, debe comprobarse que todas las migraciones incluidas en versiones anteriores estén aplicadas en Supabase.

## Pruebas recomendadas después del despliegue

1. Ingresar como cliente activo y subir una foto desde celular.
2. Crear una medición nueva y comprobar peso/grasa en Fotos y Biometría actual.
3. Confirmar que la dieta activa cambie de calorías y porciones después de la medición.
4. Marcar “entrené” en el check-in y verificar el día en Camino Imperial.
5. Seleccionar **Mes pasado** y revisar los conteos de entrenamiento, agua, nutrición y sueño.
6. Guardar una serie desde un ejercicio y recargar la página para comprobar el historial.
7. Sustituir una proteína con el menú en su límite calórico, tanto como cliente como administrador.

## Validación realizada en esta entrega

- Compilación sintáctica de los cuatro archivos TypeScript modificados mediante el compilador de TypeScript.
- Compilación de los módulos Python modificados mediante `py_compile`.
- La instalación completa de dependencias y la ejecución integral de `npm test`, `npm run build` y `pytest` no pudieron completarse en el entorno de revisión porque el repositorio interno de paquetes devolvió un error temporal 503 y el entorno Python no tenía disponibles las versiones fijadas. Deben ejecutarse en CI o en el equipo de despliegue antes de publicar en producción.
