# Auditoría y reconstrucción del banco de ejercicios

Fecha: 2026-06-22

## Resultado

- Imágenes originales recibidas: 175
- Ejercicios únicos integrados: 110
- Imágenes excluidas por repetición/fase secundaria: 65
- Imágenes finales: una por ejercicio, recortadas y centradas en formato 900x900.

## Criterio aplicado

1. Cuando existían archivos como `(2)` o `(3)` del mismo movimiento, se eligió una sola imagen representativa.
2. Se eliminaron barras de celular, hora, navegación e iconos inferiores mediante recorte automático y centrado.
3. Los archivos tipo WhatsApp sin nombre fueron identificados por contenido visual y clasificados por zona, músculo y equipo.
4. La biblioteca quedó segmentada con dos filtros: zona corporal y músculo específico.

## Distribución por zona

- cardio: 6
- core: 16
- inferior: 24
- superior: 64

## Distribución por músculo principal

- abdomen: 11
- abductor: 1
- aductor: 2
- bíceps: 14
- cardio: 6
- cuádriceps: 5
- espalda: 14
- femoral: 7
- glúteo: 3
- hombro: 8
- hombro posterior: 3
- lumbar: 1
- oblicuos: 4
- pantorrilla: 6
- pecho: 10
- tríceps: 15

## Archivos de control

- `docs/AUDITORIA_EJERCICIOS_SELECCION.csv`: ejercicios incluidos.
- `docs/AUDITORIA_EJERCICIOS_EXCLUIDOS_DUPLICADOS.csv`: imágenes no incluidas por repetición o fase secundaria.
- `backend/supabase/migrations/029_banco_visual_ejercicios_imperial.sql`: semilla opcional para base de datos si la tabla `public.exercises` usa `id` tipo texto.

## Nota técnica

El catálogo estático del frontend ya funciona sin ejecutar la semilla SQL. La semilla solo debe usarse si deseas sincronizar también la tabla `public.exercises` en la base de datos y confirmas que el campo `id` es tipo texto/varchar.
