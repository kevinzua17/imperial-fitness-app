# Informe técnico — Producción 500 usuarios + urgencia de pagos

## Objetivo
Preparar la app para un piloto comercial con hasta 500 usuarios esperados, reforzando rendimiento, consultas de registros y módulo de pagos con ofertas editables desde administración.

## Cambios principales realizados

### 1. Rendimiento para 500 usuarios
- Se agregaron índices SQL para membresías, pagos, hábitos, registros de hábitos, progresión de cargas, check-ins, rachas y resumen de gamificación.
- Se optimizó el resumen administrativo de Camino Imperial para evitar subconsultas repetidas por cada cliente.
- Se optimizó el panel de membresías para crear/actualizar estados de clientes en bloque y consultar pagos en una sola carga.
- Se añadieron variables de pool de conexión para producción:
  - `DB_POOL_SIZE=5`
  - `DB_MAX_OVERFLOW=10`
  - `DB_POOL_RECYCLE_SECONDS=1800`

### 2. Confirmación de guardado en producción
La app queda preparada para guardar y consultar:
- Pagos reportados por clientes.
- Comprobantes.
- Meses pagados por plan.
- Fecha de próximo pago.
- Estado de membresía.
- Hábitos.
- Cumplimientos de hábitos.
- Progresión de cargas.
- Check-ins.
- Camino Imperial.

La confirmación final se debe hacer en producción con 3 usuarios reales de prueba: cliente, administrador y entrenador.

### 3. Urgencia de pagos editable desde Admin
En Admin > Membresías y pagos ahora se puede modificar:
- Activar/desactivar oferta de lanzamiento.
- Título de la oferta.
- Etiqueta de urgencia.
- Fecha límite.
- Cupos disponibles y usados.
- Número Nequi.
- Instrucciones visibles para el cliente.
- Plan 1, Plan 2 y Plan 3 con:
  - nombre,
  - meses,
  - precio actual,
  - precio tachado,
  - etiqueta,
  - visibilidad,
  - plan destacado.

### 4. Paquetes de meses
El cliente puede seleccionar un plan antes de subir el comprobante.
Por defecto queda configurado:
- 1 mes: $10.000, tachado $49.000.
- 3 meses: $30.000, tachado $147.000.
- 6 meses: $54.000, tachado $294.000.

Cuando administración aprueba el comprobante, la app suma automáticamente los meses pagados al próximo vencimiento.

## SQL nuevo obligatorio
Ejecutar en Supabase:

```text
backend/supabase/migrations/023_produccion_500_pagos_urgencia.sql
```

Este SQL debe ejecutarse antes de probar los nuevos pagos por meses.

## Archivos modificados

```text
backend/app/routers/memberships.py
backend/app/routers/gamification.py
backend/app/core/config.py
backend/app/database.py
backend/supabase/migrations/023_produccion_500_pagos_urgencia.sql
backend/supabase/DEPLOY_ORDER.md
src/components/MembershipView.tsx
src/services/membershipService.ts
backend/.env.example
backend/.env.production.example
.env.production.example
.env.pilot.example
```

## Pruebas realizadas
- Compilación Python del backend: correcta.
- Typecheck completo de Node: no completado en este entorno porque no están instaladas las dependencias `node_modules`.

## Pruebas obligatorias antes de liberar a clientes
1. Ejecutar SQL 023 en Supabase.
2. Subir cambios a rama nueva en GitHub.
3. Redeploy en Render.
4. Redeploy en Vercel.
5. Entrar como administrador y editar la oferta.
6. Entrar como cliente y seleccionar plan de 1, 3 o 6 meses.
7. Subir comprobante.
8. Aprobar comprobante desde administración.
9. Verificar que el próximo pago se extiende según los meses comprados.
10. Probar Camino Imperial, hábitos y cargas con filtros.

## Recomendación comercial
Usar precio tachado únicamente si el precio de referencia es real y se puede justificar. La urgencia debe basarse en fecha límite real, cupos reales o condición de lanzamiento para evitar confusión del consumidor.
