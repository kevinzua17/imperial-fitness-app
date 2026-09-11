# Imperial Fitness v1.16.0 — Publicación verificada de planes

## Problema confirmado

La consulta de Stefanny indicó `active_routines = 1`. Ese resultado confirma que existe una fila activa, pero no demuestra que `payload_json` contenga días y ejercicios. La app cliente necesita ambas condiciones:

1. una asignación con `active = 1`;
2. contenido válido dentro de `payload_json.days[].exercises[]`.

Por eso era posible que Supabase mostrara una rutina activa y que la clienta viera el mensaje de rutina pendiente.

## Solución implementada

### Centro de publicación

El panel profesional incorpora un bloque destacado con la acción **Guardar y enviar planes**. La operación:

1. toma exactamente la dieta y rutina visibles en el editor;
2. guarda o actualiza cada plan activo;
3. vuelve a consultar el backend con caché deshabilitada;
4. comprueba que la dieta tenga comidas;
5. comprueba que la rutina tenga días y ejercicios;
6. solo entonces muestra el envío como confirmado.

También se agregaron acciones independientes:

- **Guardar y enviar alimentación**;
- **Guardar y enviar rutina**.

### Trazabilidad

La versión publicada guarda dentro de los datos existentes:

- fecha y hora de publicación;
- nombre del administrador o entrenador que confirmó el envío.

No se requiere una columna nueva ni una migración adicional. La app cliente muestra la última publicación confirmada.

### Diagnóstico más preciso

`backend/supabase/diagnostics/verify_stefanny_assignment.sql` ahora devuelve también:

- `training_days`;
- `total_exercises`;
- `payload_characters`.

Una fila activa con `training_days = 0` o `total_exercises = 0` está incompleta y debe regenerarse o editarse antes de publicarla.

### Sincronización

- Las consultas de dieta ahora envían `Cache-Control: no-store` y `Pragma: no-cache`.
- Una única respuesta vacía transitoria ya no borra inmediatamente el plan nutricional del cliente.
- La vista cliente diferencia una asignación inexistente de una asignación activa pero incompleta.

## Flujo recomendado para Stefanny

1. Ingresar como administrador.
2. Abrir **Clientes** y seleccionar a Stefanny.
3. Entrar a **Plan personalizado**.
4. Presionar **Sincronizar plan asignado**.
5. Si la rutina aparece incompleta, generar una nueva rutina o agregar días y ejercicios.
6. Revisar alimentación y entrenamiento.
7. Presionar **Guardar y enviar planes**.
8. Aceptar la confirmación con el nombre de Stefanny.
9. Esperar el mensaje verde de verificación.
10. Ingresar como Stefanny y presionar **Actualizar plan**.

## Compatibilidad

La versión conserva:

- catálogo cerrado de hipertrofia con máquinas, poleas, Smith y mancuernas;
- filtro estricto por músculo principal;
- migraciones `031_active_plan_assignment_integrity.sql` y `032_assigned_routine_persistence_guard.sql`;
- protección contra respuestas atrasadas y desactivaciones accidentales.
