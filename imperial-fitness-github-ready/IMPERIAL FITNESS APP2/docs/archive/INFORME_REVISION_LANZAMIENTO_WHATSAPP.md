# Imperial Fitness - Revisión técnica para lanzamiento

Fecha de revisión: 2026-06-09

## Proyecto recomendado

Usar como base: `imperial-fitness-proyecto-actual-revisado-membresias.zip`.

Motivo: es la versión más limpia y completa. El segundo ZIP contiene una carpeta `audit_app` más antigua y otra copia duplicada del proyecto principal, por lo que puede generar confusión al subir a GitHub o desplegar.

## Correcciones aplicadas

1. Se conectó el teléfono/WhatsApp en la creación directa de clientes desde el panel de clientes.
2. Se agregó botón directo `WhatsApp` en las tarjetas de clientes.
3. Se agregó búsqueda de clientes por número de WhatsApp.
4. Se agregó visualización y botón de WhatsApp en gestión de usuarios para clientes registrados o pendientes.
5. Se ajustó el tipado del frontend para que `phoneNumber` y `whatsappOptIn` sean parte real del perfil del usuario.
6. Se corrigió la migración SQLite local para agregar `phone_number`, `whatsapp_opt_in`, `goal` y `assigned_trainer_id` en bases existentes.
7. Se actualizó `backend/supabase/schema.sql` para incluir `phone_number` y `whatsapp_opt_in` en producción.
8. Se agregó la migración `backend/supabase/migrations/017_user_phone_whatsapp.sql` para bases Supabase ya creadas.
9. Se actualizó `backend/supabase/DEPLOY_ORDER.md` con la migración de WhatsApp.

## Validaciones ejecutadas

Frontend:

```bash
npm run build
npm test
```

Resultado:

- Build de Vite correcto.
- Test de frontend correcto: 1/1.

Backend:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest -q
```

Resultado:

- Tests backend correctos: 28/28.
- Observaciones: existen advertencias de deprecación de Pydantic V2 y `datetime.utcnow()`. No bloquean el lanzamiento, pero deben limpiarse en una fase de hardening.

## Porcentaje de finalización estimado

Estado después de la corrección: 88% listo para lanzamiento controlado.

No está al 100% porque todavía faltan tareas operativas de producción:

- Configurar variables reales de entorno en backend y frontend.
- Ejecutar SQL de Supabase en el orden indicado.
- Configurar dominio, CORS y `TRUSTED_HOSTS` reales.
- Configurar SMTP real para recuperación de cuentas.
- Configurar Cloudinary o storage externo para imágenes.
- Hacer prueba de humo con un cliente real: registro, aprobación, login, membresía, rutina/dieta y contacto por WhatsApp.

## Checklist mínimo para lanzar esta semana

1. Subir esta versión corregida a GitHub.
2. Ejecutar `backend/supabase/schema.sql` si la base es nueva.
3. Si la base ya existía, ejecutar `backend/supabase/migrations/017_user_phone_whatsapp.sql`.
4. En Render/backend configurar variables de producción.
5. En Vercel/frontend configurar `VITE_API_BASE_URL` apuntando al backend real.
6. Probar registro de cliente con teléfono.
7. Entrar como administrador y aprobar cliente.
8. Validar que el botón WhatsApp abre el chat correcto con mensaje precargado.
9. Hacer una prueba desde celular como PWA.
