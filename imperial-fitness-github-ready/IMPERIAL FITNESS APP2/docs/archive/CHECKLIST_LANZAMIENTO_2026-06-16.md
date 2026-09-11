# Checklist de lanzamiento controlado — Imperial Fitness

**Fecha:** 16 de junio de 2026  
**Regla:** no marcar un punto como completado sin evidencia: captura, log, consulta SQL o prueba firmada.

## A. Base de datos y despliegue

- [ ] Crear backup completo de la base de datos de producción.
- [ ] Confirmar que el entorno apunta a PostgreSQL/Supabase de producción, no a SQLite local.
- [ ] Ejecutar el orden exacto de `backend/supabase/DEPLOY_ORDER.md`.
- [ ] Ejecutar `deploy/pilot/supabase/01_VERIFICAR_INSTALACION.sql` sin errores.
- [ ] Confirmar columnas `community_posts.visibility` y `users.last_login_at`.
- [ ] Confirmar tablas de limitaciones, membresías, pagos, gamificación y misiones.
- [ ] Verificar políticas RLS de posts, comentarios y reacciones.
- [ ] No ejecutar `backend/app/seed.py` en producción.
- [ ] Definir procedimiento de rollback y responsable.

## B. Variables y seguridad

- [ ] `ENVIRONMENT=production`.
- [ ] `VITE_DEV_MODE=false`.
- [ ] `VITE_API_BASE_URL` usa HTTPS y el dominio correcto.
- [ ] JWT secret, refresh secret y token de métricas son fuertes y diferentes.
- [ ] CORS solo incluye dominios reales autorizados.
- [ ] `/docs`, `/redoc` y `/openapi.json` no son públicos.
- [ ] `/metrics` exige token.
- [ ] El endpoint de readiness consulta la base correctamente.
- [ ] Cloudinary/almacenamiento acepta JPG, PNG y WEBP y rechaza archivos inválidos.
- [ ] Sentry registra una excepción controlada de prueba.
- [ ] El administrador cambia cualquier contraseña demo conocida.

## C. Prueba de privacidad de comunidad

Crear: Admin A, Entrenador T, Cliente C1 asignado a T, Cliente C2 amigo de C1 y Cliente C3 sin relación.

- [ ] Post “Todos” de C1: visible para C1, C2, C3 y T.
- [ ] Post “Solo amigos” de C1: visible para C1 y C2; no visible para C3 ni T por su rol.
- [ ] Post “Solo mi entrenador” de C1: visible para C1 y T; no visible para C2/C3 ni otro entrenador.
- [ ] Post “Solo yo” de C1: visible solo para C1.
- [ ] Comentarios y reacciones respetan exactamente la misma audiencia.
- [ ] Cambiar filtros no hace aparecer publicaciones no autorizadas.
- [ ] Al desconectar la API no se muestran posts locales como reemplazo.
- [ ] Una audiencia manipulada desde DevTools recibe 422.

## D. Prueba de seguridad de rutinas

- [ ] Sin limitaciones: se genera y guarda una rutina.
- [ ] Limitación leve de rodilla: se excluyen ejercicios incompatibles y se muestra resumen.
- [ ] Limitación moderada lumbar: el backend rechaza una rutina manipulada con ejercicio conflictivo.
- [ ] Limitación alta: el botón automático queda bloqueado.
- [ ] Si la API de limitaciones falla, la generación queda bloqueada.
- [ ] Una limitación que no se guardó no se muestra como confirmada.
- [ ] Resolver una limitación requiere confirmación del servidor.
- [ ] La rutina solo aparece como asignada después de respuesta exitosa del backend.
- [ ] Un entrenador solo puede asignar a clientes autorizados.
- [ ] Profesional responsable aprueba el mapa zona corporal ↔ ejercicios excluidos.

## E. Prueba de nutrición y equivalencias

- [ ] La base profesional de alimentos carga desde backend.
- [ ] Sustituir carbohidrato por carbohidrato conserva los gramos de carbohidrato objetivo.
- [ ] Sustituir proteína por proteína conserva la proteína objetivo.
- [ ] Sustituir grasa por grasa conserva la grasa objetivo.
- [ ] Se muestran calorías y los cuatro macros antes/después.
- [ ] Se muestran diferencias, compatibilidad y advertencia.
- [ ] Sustitución incompatible queda bloqueada.
- [ ] Porción impráctica queda bloqueada o requiere revisión profesional.
- [ ] Si el servidor no valida, la sustitución no se aplica en producción.
- [ ] El total diario se recalcula después de sustituir.
- [ ] Guardar el plan y volver a entrar conserva alimentos y gramos.
- [ ] Nutricionista responsable revisa diez sustituciones frecuentes reales.

## F. Prueba del Camino Imperial

- [ ] Se muestran seis pasos diarios: entrenamiento, alimentación, agua, sueño, mentalidad y progreso.
- [ ] Entrenamiento y nutrición se completan mediante check-in.
- [ ] Agua, sueño, mentalidad y progreso guardan mediante `/gamification/action`.
- [ ] Recargar la página conserva las misiones completadas.
- [ ] Repetir una acción el mismo día no duplica XP ni monedas.
- [ ] Los premios visibles coinciden con eventos de base de datos.
- [ ] La notificación se marca leída y no vuelve a aparecer.
- [ ] Sin conexión aparece error y botón Reintentar; no aparecen datos simulados.
- [ ] Cinco clientes pueden explicar qué deben hacer hoy en menos de 15 segundos.
- [ ] El catálogo de recompensas no promete canje de monedas no unificadas.

## G. Prueba de analíticas e ingresos

- [ ] Iniciar sesión actualiza `last_login_at`.
- [ ] Usuario con actividad ≤7 días aparece activo.
- [ ] Usuario con 8–30 días aparece en riesgo.
- [ ] Usuario con >30 días aparece inactivo.
- [ ] Usuario sin actividad aparece en “nunca activo”.
- [ ] Registrar pago aprobado incrementa ingresos y ventas del mes.
- [ ] Registrar gasto actualiza gastos y balance.
- [ ] Ticket promedio coincide con cálculo manual.
- [ ] Última venta y días sin ventas coinciden con base.
- [ ] Membresías activas, pendientes, vencidas, limitadas y suspendidas cuadran con SQL.
- [ ] Ingreso potencial perdido coincide con mensualidades vencidas/limitadas.
- [ ] Seleccionar cliente para registrar pago no usa accidentalmente el primer cliente.
- [ ] Exportar o capturar cierre diario para conciliación.

## H. Membresía y acceso

- [ ] Trial activo permite módulos premium.
- [ ] Pago pendiente muestra estado de validación.
- [ ] Membresía limitada/suspendida redirige a Pagos o Perfil.
- [ ] Si falla la consulta de membresía, el frontend no habilita acceso premium.
- [ ] Aplicar y probar paywall también en endpoints premium del backend.
- [ ] Aprobar pago reactiva el acceso sin volver a iniciar sesión.
- [ ] Rechazar pago muestra motivo al cliente.
- [ ] Monto, referencia y comprobante quedan auditables.

## I. Pruebas técnicas finales

- [ ] `npm ci`.
- [ ] `npm run typecheck`.
- [ ] `npm test -- --run`.
- [ ] `npm run build`.
- [ ] `npm audit --omit=dev --audit-level=high`.
- [ ] `PYTHONPATH=backend pytest -q backend/tests`.
- [ ] `PYTHONPATH=backend python scripts/production_readiness_check.py`.
- [ ] `pip check`.
- [ ] Prueba móvil Android/iOS si se publicará con Capacitor.
- [ ] Prueba en Chrome, Safari y dispositivo Android real.
- [ ] Medir carga inicial en red 4G.

## J. Operación del piloto

- [ ] Designar responsable técnico y responsable profesional.
- [ ] Definir canal de soporte visible para clientes.
- [ ] Revisar errores y pagos al menos dos veces al día durante el piloto.
- [ ] Definir severidades: P0 caída/privacidad/seguridad; P1 pago/plan; P2 visual.
- [ ] Registrar incidentes con hora, usuario, pasos, evidencia y resolución.
- [ ] No usar mensajes comerciales que prometan curación.
- [ ] Recoger métricas D1, D3 y D7 de uso y comprensión del Camino Imperial.
- [ ] Decidir expansión o rollback con evidencia al finalizar los primeros siete días.
