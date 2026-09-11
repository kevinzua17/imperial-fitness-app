# Imperial Fitness v1.18.0 - Plataforma gimnasio

Proyecto listo para subir a GitHub y desplegar con frontend en Vercel y backend en Render.

## Estructura

- `src/`: frontend React + Vite + TypeScript.
- `backend/`: API FastAPI.
- `backend/supabase/`: esquema y migraciones SQL para Supabase/PostgreSQL.
- `render.yaml`: blueprint del backend para Render.
- `vercel.json`: configuración del frontend para Vercel.
- `.env.example` y `backend/.env.example`: variables locales.
- `.env.production.example` y `backend/.env.production.example`: variables de producción.

## Ejecución local

Frontend:

```bash
npm ci
cp .env.example .env
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Pruebas backend:

```bash
python -m pytest backend/tests -q
```

## Despliegue

### Render backend

1. Sube este repositorio a GitHub.
2. En Render crea un Blueprint o Web Service usando `render.yaml`.
3. Cambia `TU-FRONTEND.vercel.app` y `TU-BACKEND.onrender.com` por tus dominios reales.
4. Configura las variables secretas: `DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`, `CLOUDINARY_URL`, SMTP y `UPTIME_CHECK_TOKEN`.
5. Health check: `/health/ready`.

### Vercel frontend

1. Importa el repositorio desde GitHub.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Variable obligatoria: `VITE_API_BASE_URL=https://TU-BACKEND.onrender.com`.

## Seguridad aplicada en esta versión

- Repositorio limpio sin `.git`, `node_modules`, `dist`, cachés ni bases de datos locales.
- Access token del frontend en memoria, no persistido como token en `localStorage`.
- Refresh token manejado por cookie `HttpOnly` desde backend.
- CSP backend endurecido sin `unsafe-inline` en `script-src`.
- Fotos de progreso guardadas como privadas en local y servidas mediante enlaces firmados temporales.
- `X-Request-ID` por solicitud.
- Logs de auditoría para operaciones `POST`, `PUT`, `PATCH` y `DELETE`.
- Handlers globales de errores y validación.

## Cambios principales v1.17.0

- Verificación integral de entrega de rutinas con identidad, membresía, contenido y duplicados de cuenta.
- El panel deja de declarar éxito cuando la rutina está guardada pero el cliente está bloqueado por membresía.
- Límite de rutinas asignadas ampliado de 50.000 a 500.000 caracteres sin truncamiento de JSON.
- Errores de publicación visibles y respuesta específica para HTTP 402.
- Diagnóstico integral de Stefanny en `backend/supabase/diagnostics/diagnose_stefanny_delivery_v1.17.sql`.
- Versión del backend visible en `/health` y verificación del índice crítico en `/health/ready`.
- Normalización de correo en login y administración para evitar nuevos duplicados por mayúsculas.
- Caché PWA incrementada a v13.

No hay una migración SQL nueva para v1.17.0. Deben mantenerse aplicadas las migraciones `031` y `032`.

Consulta `REPORTE_TECNICO_v1.17.0.md` e `INSTRUCCIONES_DESPLIEGUE_v1.17.0.md` antes de publicar.

## Historial v1.16.0



- Nuevo **Centro de publicación** con el botón principal `Guardar y enviar planes`.
- Botones independientes `Guardar y enviar alimentación` y `Guardar y enviar rutina`.
- Confirmación contra el servidor: el sistema no declara éxito solo porque exista una fila activa; comprueba comidas, días y ejercicios reales.
- Registro visible de fecha y responsable de la última publicación confirmada, sin requerir una nueva columna en la base de datos.
- La app cliente diferencia entre “sin asignación” y “asignación activa incompleta”.
- Caché deshabilitada también en las consultas del plan nutricional.
- Protección equivalente para que una respuesta nutricional vacía y transitoria no borre el plan del cliente.
- Diagnóstico de Stefanny ampliado con `training_days`, `total_exercises` y tamaño de `payload_json`.
- Conserva las correcciones v1.15.0 del generador profesional de hipertrofia y de persistencia de rutinas.

No hay una migración SQL nueva para v1.16.0. Deben mantenerse aplicadas las migraciones `031` y `032` de la versión anterior.

Consulta `REPORTE_TECNICO_v1.16.0.md` e `INSTRUCCIONES_DESPLIEGUE_v1.16.0.md` antes de publicar.

## Validación realizada

- Parse correcto de 94 archivos TS/TSX.
- TypeScript estricto correcto para el motor del generador y sus dependencias locales.
- Generación ejecutada correctamente para 12 grupos musculares y seis divisiones semanales.
- Sintaxis Python correcta y protección verificada para impedir desactivación accidental mediante edición.
- Escaneo de secretos y revisión de preparación de producción: correctos.

La instalación npm y la suite pytest completas deben ejecutarse en el entorno de despliegue con acceso al registro de dependencias. El detalle está en `VALIDACION_v1.16.0.txt`.


## Cambios principales v1.18.0

- Menú superior fijo convertido en selector desplegable de módulos.
- Secciones extensas convertidas en paneles desplegables para reducir el desplazamiento.
- Edición administrativa de fechas de acceso: pendiente, activación, suspensión y último cambio.
- Edición administrativa de fechas de membresía, vencimiento y pagos.
- Estado manual temporal de membresía con retorno seguro al cálculo automático.
- Camino Imperial organizado en resumen, hábitos, fuerza e insignias desplegables.
- Nueva migración idempotente `033_access_membership_dates_and_manual_control.sql`.

Antes de desplegar v1.18.0 ejecuta la migración `033` en Supabase y confirma en `/health/ready` que `access_membership_dates_ready` sea `true`.
