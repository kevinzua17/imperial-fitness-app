# Informe de desarrollo: Reto Camino Imperial 8 Semanas

## Objetivo
Se creó un módulo comercial y operativo para vender un reto de transformación de 8 semanas dentro de la app, con precio editable, cupos, fechas, garantía condicionada y seguimiento automático de cumplimiento.

## Cambios principales

### Vista cliente
- Tarjeta comercial del reto con precio actual, precio de referencia tachado, ahorro, cupos y fechas.
- Botón para reservar cupo.
- Estado de inscripción: cupo reservado, pago pendiente o inscrito.
- Avance del reto por semana.
- Barras de cumplimiento para hábitos, entrenamiento, nutrición y cargas.
- Indicadores de mejora.
- Estado de garantía: en proceso, resultado logrado, revisar devolución o no aplica por cumplimiento.

### Vista admin/entrenador
- Crear y editar reto desde la app.
- Configurar precio, precio tachado, cupos, duración, fechas, etiqueta de urgencia y estado.
- Activar o desactivar garantía condicionada.
- Definir cumplimiento mínimo e indicadores mínimos de mejora.
- Ver participantes por reto.
- Validar pago del reto.
- Registrar mediciones iniciales/finales básicas del participante.

### Reglas inteligentes de cumplimiento
El avance del reto se calcula con registros reales:
- hábitos completados,
- check-ins de entrenamiento,
- check-ins de nutrición,
- registros de cargas,
- asistencia registrada,
- mediciones iniciales/finales cuando se ingresen.

### Garantía condicionada
La garantía no es abierta. La app diferencia:
- en proceso,
- resultado logrado,
- no aplica por bajo cumplimiento,
- revisar devolución cuando sí cumplió pero no mejoró en los indicadores requeridos.

## Archivos modificados
- backend/app/models.py
- backend/app/schemas.py
- backend/app/routers/challenges.py
- src/services/challengeService.ts
- src/components/ChallengesView.tsx
- src/components/Navigation.tsx

## SQL nuevo obligatorio
- backend/supabase/migrations/024_reto_camino_imperial_8_semanas.sql

## Validación realizada
- Compilación Python correcta con `python3 -m compileall backend/app`.
- TypeScript/build no se pudo validar completamente en este entorno porque no estaban instaladas las dependencias de Node.

## Recomendación de pruebas
1. Crear reto como admin.
2. Editar precio, cupos y garantía.
3. Inscribir cliente.
4. Validar pago desde participantes.
5. Registrar hábitos/check-ins/cargas.
6. Revisar avance del cliente.
7. Registrar mediciones iniciales/finales.
8. Revisar estado de garantía al cierre.
