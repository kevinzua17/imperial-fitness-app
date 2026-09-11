# Hotfix solicitud de acceso cliente

## Problema
Algunos usuarios veían el mensaje genérico:

> No se pudo enviar la solicitud. Revisa tu conexión o intenta nuevamente.

El flujo no mostraba la causa real al cliente y el endpoint público dependía demasiado del modelo ORM completo de `users`.

## Corrección
- El frontend ahora muestra mensajes reales de API cuando son seguros.
- El formulario evita enviar medidas inválidas cuando el usuario deja campos numéricos vacíos.
- El endpoint `/auth/register` usa inserción compatible por columnas disponibles para evitar fallos por diferencias menores entre esquemas existentes.
- Se mantienen estados `pending` para aprobación desde administración.
- No se ejecutó SQL y no se tocó Supabase.

## Validación mínima local
- `python -m py_compile backend/app/routers/auth.py` OK.
- El typecheck frontend requiere instalar dependencias con `npm ci` en el entorno de despliegue.
