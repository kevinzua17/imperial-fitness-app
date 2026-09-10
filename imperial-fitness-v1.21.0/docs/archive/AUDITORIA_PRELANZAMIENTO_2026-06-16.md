# Auditoría minuciosa de prelanzamiento — Imperial Fitness

**Fecha:** 16 de junio de 2026  
**Versión revisada:** `IMPERIAL FITNESS APP2`  
**Objetivo:** reducir riesgos antes del lanzamiento y mejorar privacidad, seguridad de rutinas, precisión nutricional, adherencia del Camino Imperial y capacidad de decisión administrativa.

## 1. Dictamen ejecutivo

El proyecto queda en condición de **GO condicionado para un piloto controlado**, con usuarios reales limitados, monitoreo diario y posibilidad de reversión. No recomiendo un lanzamiento público masivo hasta completar la ejecución de migraciones en la base de datos real, las pruebas manuales con los tres roles y la validación de los servicios externos de producción.

La aplicación ya supera los principales defectos funcionales detectados durante la revisión: audiencias de publicaciones incompletas, generación automática sin consultar limitaciones activas, sustituciones presentadas como “exactas” sin conservar los macros, gamificación que no persistía correctamente y analíticas administrativas fragmentadas.

La aplicación **no debe prometer curar dolores ni sustituir valoración médica, fisioterapéutica o nutricional**. Su propuesta responsable es ayudar a detectar restricciones, adaptar planes, mejorar adherencia, registrar evolución y facilitar el seguimiento profesional.

## 2. Cambios implementados por área solicitada

### 2.1 Privacidad de publicaciones en la comunidad

Se implementaron cuatro audiencias seleccionables antes de publicar:

- **Todos:** visible para cualquier usuario autenticado con acceso a la comunidad.
- **Solo amigos:** visible únicamente para amistades aceptadas y para el autor.
- **Solo mi entrenador:** visible solo para el autor y el entrenador que está realmente asignado a ese cliente.
- **Solo yo:** visible exclusivamente para el autor, sin excepción automática para administradores.

La misma regla se aplica a la lectura de comentarios y a las reacciones. El servidor rechaza audiencias no válidas con error 422 en vez de convertirlas silenciosamente en públicas. La interfaz muestra la audiencia elegida, permite filtrar el feed y no recurre a publicaciones locales si falla la carga del feed privado en producción.

**Riesgo corregido:** anteriormente un rol de entrenador podía ver contenido que no necesariamente pertenecía a uno de sus clientes, y la interfaz no permitía elegir la audiencia al publicar.

### 2.2 Seguridad de la rutina automática

La generación automática ahora consulta las limitaciones activas registradas en **Cuidado Imperial** y analiza zona corporal, severidad, comentarios y ejercicios incompatibles.

- Una limitación de severidad **alta** bloquea la generación automática y exige revisión profesional/manual.
- Una limitación moderada o leve filtra ejercicios incompatibles por zona corporal.
- El backend vuelve a validar la rutina antes de guardarla; no depende solamente del navegador.
- Si no se pueden cargar las limitaciones desde el servidor, la generación queda bloqueada por seguridad.
- Una limitación ya resuelta deja de bloquear o filtrar.
- La rutina no se presenta como “asignada” hasta que el servidor confirma el guardado.

**Riesgo crítico corregido:** las limitaciones podían quedar guardadas únicamente en `localStorage` cuando fallaba la API, generando una falsa sensación de protección. En producción, las altas y resoluciones deben quedar confirmadas en base de datos.

### 2.3 Equivalencias nutricionales según el plan

La sustitución de alimentos dejó de basarse en una supuesta equivalencia exacta por calorías o por un único valor aislado. La nueva lógica:

- Conserva con exactitud matemática el **macronutriente principal del grupo**: proteína para fuentes proteicas, carbohidratos para fuentes de carbohidrato y grasa para fuentes de grasa.
- Calcula la porción equivalente en gramos sin forzarla artificialmente al antiguo rango fijo de 50–450 g.
- Muestra calorías, proteína, carbohidratos y grasa antes y después.
- Muestra diferencias absolutas, porcentaje de compatibilidad y advertencia.
- Bloquea sustituciones entre grupos incompatibles o con porciones imprácticas.
- En producción exige que ambos alimentos existan en la base profesional y que el servidor confirme el cálculo.
- La dieta automática no se asigna si la base nutricional profesional no está disponible.

**Aclaración necesaria:** ningún alimento distinto puede garantizar igualdad simultánea de todos los macros con una sola porción. Por eso la aplicación conserva el macro principal y hace visible la variación de los demás, en vez de afirmar una “equivalencia exacta” que no existe.

### 2.4 Rediseño del Camino Imperial

El flujo se simplificó alrededor de una sola pregunta: **“¿Qué debo completar hoy?”**

La pantalla principal ahora muestra:

1. Progreso diario completado/total.
2. Entrenamiento y alimentación como estados automáticos vinculados al check-in.
3. Cuatro acciones directas: agua, sueño, mentalidad y progreso.
4. Una sola racha principal.
5. Nivel y progreso al siguiente nivel.
6. XP, monedas, escudos e insignias en una sección secundaria desplegable.

También se corrigió un fallo crítico de integración: el frontend enviaba las acciones a una ruta y con campos diferentes a los esperados por el backend. Ahora usa `/gamification/action`, el campo `kind`, el método correcto para notificaciones y las mismas claves de misión que el servidor.

Se eliminaron premios dobles ocultos: lo anunciado en pantalla coincide con lo realmente otorgado. En producción ya no se generan avances simulados si falla la API; se muestra un error con opción de reintento. También se retiró el botón que permitía “reclamar” tokens localmente con cada clic.

### 2.5 Analíticas administrativas

Se agregó un panel administrativo con:

- Usuarios activos en los últimos 7 días.
- Usuarios en riesgo entre 8 y 30 días.
- Usuarios inactivos por más de 30 días.
- Usuarios que nunca registraron actividad.
- Actividad basada en inicio de sesión, check-in, asistencia, comunidad, entrenamiento y métricas corporales.
- Ingresos mensuales, gastos, balance neto e ingreso esperado.
- Ingreso potencial perdido por vencimientos, limitaciones o suspensiones.
- Ventas del mes, ticket promedio, fecha de última venta y días sin ventas.
- Serie de seis meses de ingresos, gastos y balance.
- Estado de membresías y lista priorizada de clientes para seguimiento.

Las analíticas priorizan las tablas nuevas de membresías y pagos; solo usan las tablas antiguas como compatibilidad cuando la instalación todavía no tiene el módulo nuevo.

## 3. Correcciones adicionales de prelanzamiento

- Documentación OpenAPI deshabilitada en producción.
- Endpoint de métricas protegido por token en producción.
- Readiness real con consulta `SELECT 1` a la base de datos.
- Script de datos demo bloqueado en producción salvo habilitación explícita extraordinaria.
- Ejemplos de entorno de producción actualizados.
- Vite actualizado a 8.0.16; auditoría npm sin vulnerabilidades conocidas.
- CI incluye verificación de tipos TypeScript.
- Sesión válida ya no se cierra por una falla secundaria al cargar dieta o rutina.
- La verificación de membresía en el frontend falla de forma cerrada: si no puede validarse, dirige a Pagos/Perfil en lugar de habilitar módulos premium.
- Se evitaron actualizaciones optimistas falsas en reacciones de la comunidad.

## 4. Validaciones automáticas ejecutadas

| Validación | Resultado |
|---|---:|
| Pruebas backend | **33/33 aprobadas** |
| Pruebas frontend | **4/4 aprobadas** |
| TypeScript `tsc --noEmit` | **Aprobado** |
| Compilación Vite de producción | **Aprobada** |
| Auditoría npm de producción | **0 vulnerabilidades conocidas** |
| Correspondencia servicios frontend/API | **116/116 llamadas con ruta y método válidos** |
| Compilación Python | **Aprobada** |
| `pip check` | **Sin dependencias rotas** |
| Verificación interna de preparación | **Aprobada para piloto controlado** |

### Advertencias no bloqueantes

- El build muestra una advertencia de `vite-plugin-singlefile` por la opción obsoleta `inlineDynamicImports`.
- El archivo HTML final pesa aproximadamente **1,12 MB** y **284 KB comprimido**. Es aceptable para el piloto, pero conviene migrar a separación de chunks para mejorar carga inicial.
- El backend emite numerosas advertencias de deprecación de Pydantic, `datetime.utcnow`, SQLAlchemy/Jose y `python-json-logger`; no rompen el lanzamiento actual, pero deben resolverse antes de futuras actualizaciones mayores.
- No se pudo completar una auditoría CVE de paquetes Python con `pip-audit` por una limitación de red/DNS del entorno de revisión. `pip check` sí confirmó que no hay dependencias rotas.

## 5. Riesgos que permanecen antes de un lanzamiento masivo

### P0 — Deben resolverse o validarse antes de abrir al público

1. **Ejecutar migraciones en la base real.** La privacidad, última sesión, membresías, gamificación y analíticas dependen de las migraciones y del orden descrito en `backend/supabase/DEPLOY_ORDER.md`.
2. **Prueba real por roles.** Validar con una cuenta admin, una de entrenador, dos clientes amigos y un cliente sin amistad, incluyendo asignación de entrenador.
3. **Comprobar servicios externos.** Base PostgreSQL/Supabase, almacenamiento de imágenes, correo, Redis si se activa, dominio HTTPS, CORS y Sentry.
4. **Backup y reversión.** Crear copia de base y definir quién puede volver a la versión anterior si una migración falla.
5. **Paywall también en servidor.** La interfaz bloquea módulos si la membresía no se valida, pero todavía conviene aplicar la regla de membresía como dependencia obligatoria en cada API premium. Un usuario técnico con un token válido podría intentar llamar directamente ciertos endpoints.
6. **Aprobación profesional del catálogo de restricciones.** Las reglas reducen riesgo, pero el catálogo de ejercicios/zonas debe ser firmado por un profesional responsable antes de usarse como criterio clínico.

### P1 — Primera semana después del piloto

- Unificar completamente los dos módulos históricos de finanzas/membresías y retirar el legado.
- Unificar `tokens` del catálogo de recompensas con `imperial_coins` del Camino Imperial o definir claramente que son monedas distintas.
- Mover el access token fuera de `localStorage` y endurecer CSP para reducir impacto de XSS.
- Agregar pruebas end-to-end con Playwright/Cypress para los cinco flujos críticos.
- Instrumentar embudo: registro → perfil completo → primer plan → primer check-in → día 3 → día 7 → renovación.
- Añadir cohortes de retención D1, D7, D30 y tasa de recuperación de clientes en riesgo.

## 6. Criterio de salida recomendado

Lanzar primero a un grupo pequeño y controlado. El piloto puede considerarse exitoso si durante siete días se cumplen simultáneamente estos criterios:

- Cero publicaciones visibles fuera de su audiencia.
- Cero rutinas automáticas asignadas con una limitación alta activa.
- Cero sustituciones guardadas sin mostrar diferencias de macros.
- Al menos 80 % de los clientes entiende qué hacer hoy en Camino Imperial sin explicación externa.
- Todos los pagos del piloto aparecen en el panel financiero y coinciden con los comprobantes.
- Los errores críticos quedan por debajo del 1 % de sesiones y tienen trazabilidad en logs/Sentry.

## 7. Conclusión

La aplicación mejoró de manera sustancial y ahora tiene controles reales en las cinco áreas solicitadas. El código está en condiciones de pasar a un **piloto de producción controlado**, no todavía a una apertura masiva sin supervisión. La prioridad comercial no debe ser afirmar que “cura dolores”, sino demostrar que ayuda al cliente a entrenar con mayor seguridad, seguir su plan con claridad, mantener hábitos y recibir acompañamiento medible.
