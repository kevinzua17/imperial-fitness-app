# Imperial Fitness v1.21.1 Simple Staff

## Motivo de esta revisión
La v1.21.0 incorporó cambios reales de backend y una experiencia simplificada para clientes, pero la navegación de administrador y entrenador conservó demasiados módulos visibles. Esto hacía que, al probar la aplicación como administrador, la actualización se percibiera casi igual a la versión anterior.

## Cambios visibles
- Navegación principal de cliente reducida a 5 accesos: Hoy, Mi plan, Progreso, Mi coach y Perfil.
- Navegación principal de entrenador reducida a 5 accesos: Inicio, Clientes, Planes, Herramientas coach y Perfil.
- Navegación principal de administrador reducida a 5 accesos: Inicio, Clientes, Planes, Centro de gestión y Perfil.
- Nuevo Centro de gestión que agrupa herramientas avanzadas sin eliminarlas.
- Indicador visible de versión en la cabecera: `v1.21.1`.
- `/health/live` del backend devuelve también la versión desplegada.

## Compatibilidad
No se eliminan los módulos históricos. Continúan autorizados por rol y se abren desde el Centro de gestión, por lo que no se rompe funcionalidad existente.

## Cambios heredados de v1.21.0
- PDF profesional de rutina + alimentación.
- Seguridad nutricional ampliada.
- Auditoría de volumen semanal.
- Hubs de cliente para progreso, coach y cuenta.
- Migraciones 035/036 y correcciones históricas 027/028.
- Mejoras de progresión y trazabilidad.
