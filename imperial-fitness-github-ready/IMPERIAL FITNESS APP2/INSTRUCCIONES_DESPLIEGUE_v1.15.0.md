# Despliegue Imperial Fitness v1.15.0

## 1. Base de datos

En Supabase → SQL Editor, ejecutar en orden:

```text
backend/supabase/migrations/031_active_plan_assignment_integrity.sql
backend/supabase/migrations/032_assigned_routine_persistence_guard.sql
```

Después ejecutar el diagnóstico:

```text
backend/supabase/diagnostics/verify_stefanny_assignment.sql
```

Para Stefanny debe aparecer exactamente una rutina con `active = 1`.

## 2. Backend

Redesplegar el backend en Render con el contenido de esta versión. Confirmar que el endpoint de salud responde correctamente y que las consultas de rutina devuelven `Cache-Control: no-store`.

## 3. Frontend

Redesplegar en Vercel. El Service Worker cambió a caché `v11`, por lo que la nueva versión reemplazará los archivos estáticos anteriores.

## 4. Prueba funcional mínima

1. Ingresar como entrenador o administrador.
2. Seleccionar a Stefanny desde Clientes.
3. Abrir Plan personal y confirmar que el nombre seleccionado sea Stefanny.
4. Generar una rutina de hipertrofia, por ejemplo pecho + tríceps.
5. Confirmar que solo aparezcan máquinas, poleas, Smith o mancuernas y que cada ejercicio tenga músculo principal de pecho o tríceps.
6. Cerrar sesión e ingresar como Stefanny.
7. Abrir Mi plan, cambiar de pestaña, recuperar el foco y esperar al menos dos ciclos de sincronización.
8. Confirmar que la rutina continúa visible.
9. Editar el título de la rutina desde el panel profesional y confirmar que sigue activa.
10. Asignar una nueva rutina y confirmar que la anterior queda histórica y solo la nueva permanece visible.
