# Checklist de lanzamiento seguro — Imperial Fitness v1.20.0

**Ventana prevista:** 5–6 de agosto de 2026  
Marcar cada casilla con evidencia. Los puntos **BLOQUEANTE** impiden abrir a 500 usuarios.

## 1. Antes de tocar producción

- [ ] **BLOQUEANTE:** congelar cambios adicionales durante el despliegue.
- [ ] **BLOQUEANTE:** crear backup verificable de Supabase y anotar hora/identificador.
- [ ] Exportar variables actuales de Render y Vercel sin compartir sus valores.
- [ ] Confirmar que existe una versión desplegable de v1.19.1 para rollback.
- [ ] Ejecutar `scripts/secret_scan.py`.
- [ ] Ejecutar `scripts/production_readiness_check.py`.
- [ ] Ejecutar `scripts/prelaunch_guard_v120.py`.
- [ ] Revisar que el ZIP o repositorio no incluya `.env`, bases locales, uploads privados ni credenciales.

## 2. Control de cuentas y contraseñas

- [ ] **BLOQUEANTE:** ejecutar antes de migrar `backend/supabase/diagnostics/VERIFICAR_MIGRACION_034_v1.20.0.sql` y guardar solo los conteos.
- [ ] Registrar el total de usuarios, hashes nulos y hashes de longitud sospechosa.
- [ ] Confirmar que `hashes_nulos = 0` y `hashes_con_longitud_sospechosa = 0` antes de continuar.
- [ ] Confirmar que no hay roles inválidos.
- [ ] No ejecutar `UPDATE`, `DELETE`, `TRUNCATE` ni restauraciones sobre `users.password_hash`, `refresh_tokens` o `password_reset_tokens`.

## 3. Supabase

- [ ] **BLOQUEANTE:** ejecutar únicamente la migración `034_nutrition_exercise_launch_hardening.sql` después del backup.
- [ ] Ejecutar nuevamente el diagnóstico de solo lectura.
- [ ] Confirmar `columnas_v120_encontradas = 17`.
- [ ] Confirmar `inconsistencias_activas = 0`.
- [ ] Confirmar `clientes_con_mas_de_un_plan_activo = 0`.
- [ ] Confirmar `tmb_sin_fuente = 0` para las mediciones con TMB.
- [ ] **BLOQUEANTE:** ejecutar `backend/supabase/diagnostics/VERIFICAR_RLS_Y_ROL_API_v1.20.0.sql`.
- [ ] Confirmar `tablas_sensibles_encontradas = 5`, `tablas_sensibles_con_rls = 5` y `tablas_sensibles_sin_rls = 0`.
- [ ] Revisar si el rol de conexión es superusuario o `BYPASSRLS`; en ese caso, mantener obligatoriamente los controles explícitos de la API y nunca exponer esa credencial al frontend.
- [ ] Comparar total de usuarios y controles de hashes con los valores previos: deben ser iguales.
- [ ] Verificar límites de conexiones y modo de conexión de `DATABASE_URL`.
- [ ] Confirmar que la clave `service_role` nunca llega al frontend.

## 4. Render

- [ ] **BLOQUEANTE:** confirmar `DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`, `CLOUDINARY_URL`, SMTP y Sentry.
- [ ] Confirmar dominios definitivos en `CORS_ORIGINS`, `TRUSTED_HOSTS`, `FRONTEND_URL` y `BACKEND_URL`.
- [ ] Confirmar `DB_AUTO_CREATE=false`.
- [ ] Confirmar `WEB_CONCURRENCY=2`, `DB_POOL_SIZE=3` y `DB_MAX_OVERFLOW=2` para el primer despliegue.
- [ ] Desplegar backend v1.20.0.
- [ ] **BLOQUEANTE:** ejecutar `python scripts/verify_v120_deployment.py https://URL-BACKEND`.
- [ ] Confirmar `/health/ready`: `status=ready`, versión 1.20.x, ambos flags v2, `rls_sensitive_tables_ready=true` y `redis_ready=true`.
- [ ] Revisar logs: sin 500, errores de conexión, migraciones automáticas ni fugas de datos.
- [ ] Simular una interrupción breve de Redis en staging: las lecturas deben degradar sin 500 y `/health/ready` debe responder 503 hasta recuperar/reiniciar Redis.

## 5. Prueba autenticada sin escritura

- [ ] Crear/seleccionar una cuenta interna de prueba; no usar una contraseña de cliente real en scripts.
- [ ] Obtener temporalmente un access token de prueba.
- [ ] Ejecutar `IMPERIAL_ACCESS_TOKEN=... python scripts/verify_v120_deployment.py https://URL-BACKEND`.
- [ ] Verificar lectura de perfil, alimentos, ejercicios y dieta actual.
- [ ] Borrar la variable temporal del terminal al terminar.

## 6. Vercel

- [ ] **BLOQUEANTE:** confirmar `VITE_API_BASE_URL` con HTTPS y dominio del backend correcto.
- [ ] Ejecutar build de producción en Vercel.
- [ ] **BLOQUEANTE:** build sin errores TypeScript, dependencias ni variables.
- [ ] Desplegar como preview y probar login, logout, refresh y recuperación.
- [ ] Verificar CSP en consola: sin bloquear API, Cloudinary, fuentes o imágenes necesarias.
- [ ] Promover a producción solo después de aprobar la preview.

## 7. Cloudinary

- [ ] Verificar carga JPG, PNG y WebP válidos.
- [ ] Verificar rechazo de archivo renombrado con firma inválida.
- [ ] Verificar que progreso y comprobantes usan recursos privados/enlaces temporales.
- [ ] Confirmar límites de almacenamiento, ancho de banda y transformaciones del plan.
- [ ] Confirmar que ninguna API secret aparece en navegador o bundle.
- [ ] Verificar que una imagen pública nueva se entrega con `f_auto`, `q_auto` y límite de ancho, conservando el original.
- [ ] Confirmar que fotos de progreso y comprobantes continúan privados y no se convierten en URLs públicas permanentes.

## 8. Prueba funcional

- [ ] Perfil incompleto: la dieta se bloquea y muestra qué dato falta.
- [ ] Perfil completo sin InBody: usa Mifflin–St Jeor y lo informa.
- [ ] Perfil con TMB InBody confirmada: usa esa TMB y registra la fuente.
- [ ] Menor de 18 años: no permite generación automática.
- [ ] Crear borrador: el cliente conserva su dieta publicada anterior.
- [ ] Publicar borrador válido: archiva la versión anterior y muestra la nueva.
- [ ] Plan con desviación calórica mayor de 5 %: publicación bloqueada.
- [ ] Plan con calorías correctas pero proteína fuera de ±15 %, o carbohidratos/grasas fuera de ±20 %: publicación bloqueada.
- [ ] Nueva medición corporal: no modifica automáticamente la dieta publicada.
- [ ] Cliente visualiza ejercicios y filtra por bíceps, cuádriceps, abdomen y otros músculos.
- [ ] Cliente no puede editar ni aprobar ejercicios.
- [ ] Administrador controla visibilidad, aprobación y elegibilidad de rutina.
- [ ] Catálogo supera 120 resultados mediante “cargar más”.

## 9. Carga y apertura gradual

- [ ] **BLOQUEANTE:** prueba interna con 10 usuarios concurrentes.
- [ ] Prueba de 50 usuarios: `python scripts/load_test_500_readonly.py --base-url ... --concurrency 50 --requests 500`.
- [ ] Confirmar error <1 %, sin 502/503 sostenidos y sin agotamiento de conexiones.
- [ ] Prueba objetivo de 100 usuarios concurrentes antes de abrir a 500 registrados.
- [ ] Abrir a 50 usuarios; observar métricas al menos un ciclo de uso completo.
- [ ] Abrir a 150 usuarios si no hay regresiones.
- [ ] Abrir a 500 usuarios registrados; mantener monitoreo de API, DB, Redis y Cloudinary.

## 10. Decisión final

Autoriza el lanzamiento únicamente cuando:

- [ ] todos los bloqueantes estén aprobados;
- [ ] exista backup y rollback probado;
- [ ] el build real de Vercel haya pasado;
- [ ] readiness sea completamente verde;
- [ ] login de cuentas existentes siga funcionando;
- [ ] conteos de usuarios y controles de hashes no hayan cambiado;
- [ ] no haya errores críticos en logs ni prueba de carga.
