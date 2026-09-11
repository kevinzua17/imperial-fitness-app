# Despliegue Imperial Fitness v1.16.0

## 1. Base de datos

Esta versión no agrega una migración SQL. Verificar que ya estén aplicadas, en este orden:

```text
backend/supabase/migrations/031_active_plan_assignment_integrity.sql
backend/supabase/migrations/032_assigned_routine_persistence_guard.sql
```

Después, volver a ejecutar:

```text
backend/supabase/diagnostics/verify_stefanny_assignment.sql
```

En el último resultado revisar:

- `active = 1`;
- `training_days` mayor que 0;
- `total_exercises` mayor que 0.

Si `active = 1`, pero los dos conteos están en cero, la fila existe, aunque su contenido está incompleto. No se debe editar manualmente el JSON: se corrige desde el panel generando la rutina y usando **Guardar y enviar rutina**.

## 2. Backend

Redesplegar el backend en Render. Esta versión añade encabezados ant caché a:

```text
GET /nutrition/diet-plans
GET /nutrition/diet-plans/my-plan
```

Las rutas de rutina mantienen `Cache-Control: no-store`.

## 3. Frontend

Redesplegar en Vercel. El Service Worker usa caché `v12`; al abrir la aplicación, recargar una vez con `Ctrl + F5` para retirar archivos anteriores.

## 4. Publicar los planes de Stefanny

1. Entrar como administrador o entrenador autorizado.
2. Seleccionar **Saray Stefanny Ospina Suárez**.
3. Abrir **Plan personalizado**.
4. Presionar **Sincronizar plan asignado**.
5. Revisar los indicadores del Centro de publicación:
   - Alimentación lista.
   - Entrenamiento listo.
6. Si Entrenamiento figura pendiente, generar o completar la rutina.
7. Presionar **Guardar y enviar planes**.
8. Confirmar el cuadro que menciona expresamente a Stefanny.
9. No cerrar hasta ver el mensaje de envío confirmado.
10. Ingresar con la cuenta de Stefanny y presionar **Actualizar plan**.

## 5. Resultado esperado

La cuenta cliente debe mostrar:

- título y objetivo de la rutina;
- días de entrenamiento;
- ejercicios de cada día;
- alimentación y comidas;
- fecha y responsable de la última publicación confirmada.

Si existe una fila activa, pero falta contenido, la clienta verá ahora **La asignación existe, pero la rutina está incompleta**, en lugar del mensaje ambiguo de que no existe una rutina.
