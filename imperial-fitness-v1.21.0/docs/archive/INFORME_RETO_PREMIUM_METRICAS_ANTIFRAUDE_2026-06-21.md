# Informe de corrección: Reto Camino Imperial Premium

## Problema corregido
El módulo anterior podía no crear retos si la base de datos no tenía completas las columnas del reto. También el reto no estaba suficientemente separado como experiencia diferencial y el admin no tenía una revisión semanal clara para detectar cumplimiento real o posibles inconsistencias.

## Cambios aplicados
- Botón **Crear recomendado** para publicar el reto de 8 semanas con configuración segura.
- Creación de retos con manejo de error más claro si falta ejecutar SQL.
- Clientes solo ven retos activos; borradores y cerrados quedan para staff.
- Participantes con pago pendiente ven cupo reservado, pero no tablero premium completo.
- Participantes con pago validado ven tablero premium con cumplimiento, hábitos, entreno, nutrición, cargas, evidencias y alertas.
- Admin puede filtrar participantes por semana y estado de pago.
- Admin ve activos, pendientes, usuarios a revisar y posibles casos de garantía.
- Se agregaron señales de consistencia para evitar trampas: falta de medición inicial, pago pendiente, registros concentrados, entrenos sin cargas/asistencia y ausencia de check-ins.

## SQL obligatorio
Ejecutar en Supabase:

`backend/supabase/migrations/025_reto_premium_metricas_antifraude.sql`

Este archivo es robusto: crea tablas si faltan, agrega columnas si faltan y crea índices de rendimiento.

## Pruebas recomendadas
1. Ejecutar SQL 025.
2. Crear un reto desde **Crear recomendado**.
3. Inscribir un cliente.
4. Verificar que el cliente quede en pago pendiente.
5. Validar pago desde admin.
6. Confirmar que el cliente vea el tablero premium.
7. Registrar hábitos, check-ins y cargas.
8. Filtrar participantes por semana desde admin.
