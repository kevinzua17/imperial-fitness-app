# QA beta privada - Imperial Fitness

## Objetivo
Validar que la plataforma pueda probarse con clientes reales de forma controlada, antes de abrirla a operación completa.

## Usuarios mínimos de prueba
- 1 administrador.
- 2 entrenadores.
- 4 clientes: dos por entrenador.

## Flujo crítico 1: coach asigna y cliente visualiza
1. Iniciar sesión como entrenador.
2. Abrir el cliente asignado.
3. Crear o actualizar plan nutricional.
4. Crear o actualizar rutina.
5. Iniciar sesión como cliente.
6. Sincronizar planes.
7. Confirmar que solo aparece su dieta y su rutina activa.
8. Retirar plan/rutina desde coach.
9. Confirmar que desaparece del cliente sin borrar historial.

## Flujo crítico 2: permisos
1. Entrenador A intenta gestionar cliente de Entrenador B.
2. El sistema debe responder 403.
3. Cliente intenta acceder al listado de usuarios.
4. El sistema debe responder 403.

## Flujo crítico 3: producción
1. Backend responde `/health`, `/health/live` y `/health/ready`.
2. Frontend usa `VITE_API_BASE_URL` de producción.
3. CORS solo acepta dominios reales.
4. Storage externo está activo para imágenes.
5. SMTP real permite recuperación de cuenta.

## Criterio de salida
La beta privada puede iniciar cuando no existan errores bloqueantes en autenticación, asignación coach-cliente, permisos, carga de imágenes, dashboard principal y recuperación de acceso.
