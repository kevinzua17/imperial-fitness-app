# Imperial Fitness - Supabase SQL: leer primero

Para una instalación nueva en Supabase, ejecutar solo este archivo:

```txt
deploy/pilot/supabase/00_PRIMERO_EJECUTAR_INSTALACION_COMPLETA.sql
```

No ejecutar parches pequeños antes de este archivo. Si aparece el error:

```txt
relation "public.users" does not exist
```

significa que se ejecutó un parche antes de crear el esquema principal. La solución es volver al SQL Editor, borrar el texto del editor y ejecutar el archivo completo indicado arriba.

## Pasos en Supabase

1. Ir a Supabase > SQL Editor > New query.
2. Borrar todo lo que esté escrito en el editor.
3. Abrir el archivo `00_PRIMERO_EJECUTAR_INSTALACION_COMPLETA.sql` en el proyecto.
4. Copiar todo el contenido.
5. Pegarlo en el SQL Editor.
6. Presionar **Run**.
7. Cuando termine, ejecutar `01_VERIFICAR_INSTALACION.sql` para confirmar que las tablas existen.

## Nota

El archivo usa `create table if not exists`, así que puede ejecutarse nuevamente sin duplicar tablas. Si el proyecto ya tiene datos reales, no usar scripts de borrado o reset.
