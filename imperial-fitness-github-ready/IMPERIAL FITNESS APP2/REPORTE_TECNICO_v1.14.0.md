# Imperial Fitness v1.14.0 — Asignaciones estables y “Mi plan” simplificado

## Problema identificado

La dieta o rutina podía cargarse correctamente desde la API y luego desaparecer visualmente porque `PersonalPlanView` tenía dos fuentes de estado compitiendo:

1. la asignación vigente obtenida directamente del servidor;
2. una copia global/local que podía estar vacía o desactualizada mientras terminaba la carga.

Cuando la segunda actualización ocurría después, reemplazaba temporalmente el plan real. Además, una pantalla administrativa desactualizada podía intentar editar un registro que ya había sido desactivado al asignar una versión nueva.

## Correcciones aplicadas

- La API queda como fuente principal de dieta y rutina.
- Una lista local vacía ya no borra una asignación cargada desde el servidor.
- Al cambiar de cliente se muestra una copia temporal y se sincroniza inmediatamente con la API.
- Si el servidor confirma que ya no existe una asignación activa, la pantalla se limpia de forma explícita.
- Dietas y rutinas activas se ordenan por fecha e ID para seleccionar siempre la versión más reciente.
- La creación de una asignación bloquea el registro del cliente durante la transacción para evitar asignaciones simultáneas.
- El backend devuelve HTTP 409 cuando se intenta editar una dieta o rutina histórica que ya no está activa.
- Se agregó la migración `031_active_plan_assignment_integrity.sql`, que conserva solo la asignación más reciente y crea índices únicos parciales para impedir más de una dieta o rutina activa por cliente.

## Nueva experiencia del cliente en “Mi plan”

La vista del cliente fue reemplazada por una interfaz compacta:

- encabezado breve “Mi plan”;
- resumen de peso, grasa y masa muscular;
- módulo desplegable **Rutina de entrenamiento**;
- días de entrenamiento desplegables;
- ejercicios con series, repeticiones, descanso y registro de carga;
- módulo desplegable **Plan de alimentación**;
- comidas desplegables;
- cantidades claras por alimento;
- sustitución de alimentos desde el mismo módulo;
- botón único para actualizar las asignaciones.

La vista profesional del administrador y entrenador conserva las herramientas avanzadas de generación, edición y prescripción.

## Paso obligatorio en Supabase

Ejecutar en SQL Editor:

```text
backend/supabase/migrations/031_active_plan_assignment_integrity.sql
```

Esta migración debe aplicarse antes de publicar la versión 1.14.0.

## Validaciones realizadas

- Sintaxis TSX validada mediante el compilador TypeScript en modo de transpilación.
- Sintaxis Python validada con `py_compile`.
- Se añadió una prueba automatizada para comprobar que la asignación más reciente permanece visible y que una edición sobre un plan histórico responde con HTTP 409.

La suite completa no pudo ejecutarse en este entorno porque no están instaladas todas las dependencias (`python-jose` y paquetes npm no disponibles en caché). Antes del despliegue se debe ejecutar:

```bash
npm ci
npm run verify:frontend
cd backend
pip install -r requirements.txt
pytest -q
```
