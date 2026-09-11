# Control de acceso por membresía - Imperial Fitness

Este ajuste cierra el flujo comercial de prueba gratuita, vencimiento, comprobantes, validación administrativa y bloqueo progresivo.

## Cliente

El módulo **Pagos** muestra avisos internos cuando la prueba o membresía está por vencer, vencida, limitada, suspendida o con comprobante pendiente de validación.

Si la cuenta queda limitada, suspendida o pendiente de validación, el cliente solo puede acceder a:

- Pagos
- Perfil

Los módulos premium quedan pausados temporalmente hasta regularizar la membresía.

## Admin

El módulo **Membresías** concentra:

- Estados de todos los clientes.
- Próximos a vencer.
- Vencidos.
- Pendientes de validación.
- Limitados.
- Suspendidos.
- Comprobantes pendientes.
- Reglas activas de acceso.
- Marcar pago manual.
- Aprobar/rechazar comprobantes.
- Botón WhatsApp.

## Reglas

- Prueba activa: acceso completo.
- Próximo a vencer: aviso en Pagos.
- Vencido: aviso fuerte y margen de gracia.
- Limitado: solo Perfil y Pagos.
- Pendiente validación: solo Perfil y Pagos hasta aprobación.
- Suspendido: solo Perfil y Pagos.

## Backend

Se agregó un middleware que bloquea endpoints premium para clientes con estado restringido.

## Instalación

1. Ejecutar `deploy/pilot/supabase/10_AGREGAR_CONTROL_ACCESO_MEMBRESIA.sql` en Supabase.
2. Copiar `backend`, `src`, `deploy` y `docs` al proyecto.
3. Commit + Push.
4. Redeploy en Render.
5. Redeploy en Vercel.
