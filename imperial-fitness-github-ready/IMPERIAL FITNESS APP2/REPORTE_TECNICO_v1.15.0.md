# Imperial Fitness v1.15.0 — Hipertrofia profesional y asignaciones persistentes

## Objetivos de esta entrega

1. Evitar que el generador automático mezcle ejercicios infantiles, geriátricos, de rehabilitación, movilidad, cardio, bandas, calistenia o peso corporal dentro de una rutina de hipertrofia.
2. Asegurar que cada ejercicio seleccionado corresponda al **músculo principal** solicitado, no solo a una palabra parecida en el nombre.
3. Evitar que una rutina asignada —como la de Stefanny— desaparezca por respuestas atrasadas, consultas vacías transitorias o una edición genérica que cambie el estado activo.

## Generador profesional de hipertrofia

El generador quedó en modo cerrado o *fail-closed*. Un ejercicio solo puede entrar si cumple todas estas condiciones:

- está activo;
- su imagen fue revisada;
- declara un músculo principal reconocido;
- no es cardio, movilidad, estiramiento, rehabilitación, actividad infantil, actividad para adulto mayor, calistenia, banda elástica ni peso corporal;
- utiliza máquina, polea/cable, Smith, prensa, hack, Hammer, Peck Deck o mancuernas;
- su músculo principal coincide exactamente con el grupo solicitado.

La coincidencia ya no depende de encontrar palabras como “pecho” en el nombre. Por ejemplo, **Jalón al pecho** se reconoce como espalda porque su músculo principal es dorsal, y no puede entrar en un día exclusivo de pecho.

Se agregó una prioridad curada por grupo muscular para escoger primero movimientos adecuados de hipertrofia, como presses en máquina, remos y jalones, curls en máquina/polea, extensiones de tríceps, prensa/hack/extensión de cuádriceps, curls femorales, hip thrust, patada de glúteo, elevaciones de pantorrilla y trabajo de core en polea o con mancuerna.

El catálogo local contiene **74 ejercicios que superan el filtro profesional**, distribuidos en pecho, espalda, hombro, bíceps, tríceps, cuádriceps, femoral, glúteo, pantorrilla, abdomen, aductor y abductor.

## Cambios de interfaz

- El selector de fuente muestra únicamente el número de ejercicios profesionales verificados.
- El buscador manual del constructor de rutinas usa el mismo filtro estricto.
- Se retiró cardio de la planificación muscular personalizada del generador de hipertrofia.
- La interfaz explica claramente qué equipos y categorías son aceptados o rechazados.
- El calentamiento específico usa la máquina o polea del grupo muscular con carga ligera; no utiliza rutinas genéricas con bandas o peso corporal.

## Corrección de la asignación de Stefanny

Se corrigieron tres riesgos distintos:

1. **Respuesta atrasada al cambiar de cliente:** cada consulta ahora tiene un identificador. Una respuesta de un cliente anterior no puede sobrescribir la pantalla del cliente actual.
2. **Resultado vacío transitorio:** un solo `null` ya no borra la rutina global del cliente. La ausencia debe confirmarse dos veces consecutivas.
3. **Desactivación accidental por edición:** el endpoint de actualización ya no acepta el campo `active`. Una rutina solo se desactiva mediante la acción explícita de eliminar/desactivar.

Además:

- las consultas de asignaciones responden con encabezados `no-store/no-cache`;
- la creación conserva el bloqueo transaccional del cliente;
- se añadió manejo de conflicto simultáneo HTTP 409;
- al recibir un `selectedClientId` nuevo, la pantalla cambia realmente a ese cliente;
- se añadió una migración que obliga a `active` a ser 0 o 1, con valor predeterminado 1, y mantiene una sola rutina activa por cliente.

## SQL obligatorio en Supabase

Ejecutar en este orden:

```text
backend/supabase/migrations/031_active_plan_assignment_integrity.sql
backend/supabase/migrations/032_assigned_routine_persistence_guard.sql
```

Para revisar específicamente a Stefanny sin modificar datos:

```text
backend/supabase/diagnostics/verify_stefanny_assignment.sql
```

El resultado esperado para ella es `active_routines = 1`. Si devuelve 0, la rutina no está activa en la base y debe reasignarse una vez después de aplicar las migraciones. Si devuelve más de 1, la migración 031/032 no se aplicó correctamente.

## Validaciones realizadas

- Sintaxis Python de backend y pruebas: correcta.
- Esquema Pydantic: una edición que envía `active: 0` lo ignora y conserva la asignación activa.
- Sintaxis TS/TSX: 94 archivos analizados correctamente.
- TypeScript estricto del motor del generador y sus dependencias locales: correcto.
- Ejecución real del generador por 12 grupos musculares: correcta.
- Ejecución real de Full Body 3, Torso/Pierna 4, PPL 3, PPL 6, Arnold 6 y GAP: correcta; todos los ejercicios de trabajo pertenecen al catálogo verificado.

La suite npm completa no pudo instalarse en este entorno por indisponibilidad temporal del registro de paquetes (errores 503/EAI_AGAIN). La suite completa de backend tampoco pudo iniciarse porque `python-jose` no estaba disponible en el entorno. Antes del despliegue definitivo, ejecutar en una máquina con acceso a dependencias:

```bash
npm ci
npm run verify:frontend
cd backend
pip install -r requirements.txt
pytest -q
```
