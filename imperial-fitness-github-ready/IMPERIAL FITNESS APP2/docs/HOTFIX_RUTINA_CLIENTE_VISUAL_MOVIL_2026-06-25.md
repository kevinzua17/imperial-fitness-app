# Hotfix: rutina del cliente visual móvil

Fecha: 2026-06-25

## Objetivo

Mejorar la vista de rutinas asignadas para clientes, especialmente en celular, reduciendo texto visible y priorizando una experiencia visual similar a la biblioteca de ejercicios.

## Cambios

- Se agregó selector grande por día de rutina.
- Se muestra claramente Día N de M, nombre del día y foco muscular.
- Se reemplazó la lista compacta por tarjetas visuales grandes.
- Cada ejercicio muestra imagen/recorrido Inicio → Final cuando existe en el catálogo.
- Series, repeticiones y descanso aparecen como métricas visibles.
- Indicaciones extensas quedan plegadas en “Ver indicaciones del entrenador”.
- Las imágenes abren el modal técnico completo al tocarlas.
- Los nombres de ejercicios de base abierta se muestran traducidos cuando existe coincidencia en catálogo o patrón inglés reconocido.
- Se mantiene la selección/cambio inteligente de ejercicios para admin/entrenador sin alterar la estructura de rutina.

## Alcance

Frontend únicamente. No toca Supabase, no ejecuta SQL y no modifica tablas ni datos.

## Validación

- Frontend typecheck OK.
- Frontend tests: 14 passed.
- Frontend build OK.
- Backend tests: 39 passed.
- Secret scan OK.
- Production readiness OK.
