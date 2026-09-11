# Reporte de ajuste - Instalación limpia Supabase

Se reorganizó la carpeta de despliegue para evitar confusión durante la creación de tablas en Supabase.

## Ajustes realizados

- Se agregó `00_PRIMERO_EJECUTAR_INSTALACION_COMPLETA.sql` como archivo principal único para instalación nueva.
- Se agregó `01_VERIFICAR_INSTALACION.sql` para comprobar que las tablas principales fueron creadas.
- Se agregó `LEER_PRIMERO_SUPABASE_SQL.md` con pasos claros.
- El antiguo parche `00A_FIX_SYNC_EVENTS.sql` fue renombrado a `NO_USAR_SOLO_REFERENCIA_FIX_SYNC_EVENTS.sql` para evitar que se ejecute antes del esquema principal.

## Instrucción principal

En Supabase se debe ejecutar primero y solamente:

```txt
deploy/pilot/supabase/00_PRIMERO_EJECUTAR_INSTALACION_COMPLETA.sql
```

Después se puede ejecutar:

```txt
deploy/pilot/supabase/01_VERIFICAR_INSTALACION.sql
```
