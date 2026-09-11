# REPORTE FASE 10 – Cierre para prueba piloto

## Propósito de la fase
Preparar la aplicación para una beta privada controlada, reduciendo exposición de módulos por rol y dejando evidencia técnica/documental para probar con clientes reales sin mostrar herramientas internas.

## Cambios aplicados

### 1. Depuración por rol en frontend
Se agregó una matriz de pestañas permitidas por rol dentro de `src/App.tsx`. Esto evita que un cliente o entrenador pueda ver pantallas internas manipulando la URL o el estado de navegación.

- Cliente: dashboard, perfil, mi plan, comunidad, red social, fotos, recompensas, medidas, retos y chat.
- Entrenador: dashboard, perfil, clientes, planes, comunidad, fotos, seguimiento, retos, asistente interno y chat.
- Admin: acceso completo, incluyendo auditoría, accesos, finanzas e implementación en modo desarrollo.

### 2. Limpieza de experiencia del cliente
En `PersonalPlanView`, el cliente deja de ver mensajes técnicos de base científica interna. Ahora ve un aviso simple: el plan está supervisado por su entrenador y debe solicitar ajustes por chat.

### 3. Herramientas profesionales separadas
Las herramientas de creación automática/manual de dietas, base de alimentos y rutinas permanecen visibles solo para administrador/entrenador.

### 4. Guardarraíl científico en backend
Se agregó validación de consistencia calórica para planes nutricionales:

- proteína: 4 kcal/g
- carbohidratos: 4 kcal/g
- grasa: 9 kcal/g
- tolerancia: máximo entre 250 kcal o 18% del total

Esto permite crear planes manuales, pero evita guardar planes nutricionalmente absurdos o rotos antes de la prueba piloto.

### 5. Pruebas adicionales
Se agregaron pruebas para:

- bloquear herramientas profesionales a clientes;
- permitir que el entrenador cree alimentos y plantillas manuales;
- rechazar planes con calorías/macros incoherentes.

### 6. Documentación de piloto
Se agregaron:

- `docs/FASE_10_PRUEBA_PILOTO.md`
- `docs/QA_MANUAL_PILOTO.csv`
- `scripts/pilot_smoke_test.py`

## Validaciones ejecutadas

- Backend: `pytest` → 28 pruebas pasadas.
- Frontend: `npm run build` → correcto.
- Frontend tests: `npm test` → correcto.

## Estado final
El proyecto queda listo para **prueba piloto privada controlada**. Todavía no se recomienda abrirlo masivamente hasta completar 7 a 14 días de piloto con 1 admin, 2 entrenadores y 5–10 clientes.

## Próximo paso recomendado
Desplegar en entorno real, cargar usuarios piloto y ejecutar el checklist `docs/QA_MANUAL_PILOTO.csv` durante la primera semana.
