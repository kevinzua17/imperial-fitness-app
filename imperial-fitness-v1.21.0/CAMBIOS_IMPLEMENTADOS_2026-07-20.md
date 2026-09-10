# Cambios implementados — Imperial Fitness

Fecha de intervención: 20 de julio de 2026

## 1. Fotografías de progreso y comprobantes privados

### Problema corregido

Los archivos marcados como privados se almacenaban en el disco local del backend. En Render ese disco puede ser temporal, por lo que las fotografías podían desaparecer después de un reinicio o despliegue. Los comprobantes también podían terminar asociados a URLs públicas de Cloudinary.

### Solución

- Las nuevas fotos de progreso y los comprobantes se cargan en Cloudinary como recursos `authenticated`.
- La base de datos guarda una referencia opaca `cloudinary-auth://...`, nunca la URL pública del archivo.
- La API genera una URL temporal solo después de validar al cliente, entrenador asignado o administrador.
- Se valida que la referencia pertenezca a la carpeta privada del usuario correspondiente.
- Se impide registrar dos veces el mismo comprobante.
- En producción, un fallo de Cloudinary ya no degrada silenciosamente al disco temporal de Render.
- Se mantiene compatibilidad con referencias locales antiguas durante desarrollo y migración.

### Migración de datos existentes

Se agregó:

- `backend/scripts/migrate_private_media_to_cloudinary.py`
- `docs/MIGRACION_ARCHIVOS_PRIVADOS.md`

Ejecución segura desde Render Shell:

```bash
cd backend
python scripts/migrate_private_media_to_cloudinary.py
python scripts/migrate_private_media_to_cloudinary.py --apply
```

La primera orden solo diagnostica. La segunda migra los archivos encontrados y actualiza Supabase.

Los registros marcados como `MISSING` corresponden a archivos que ya desaparecieron del disco temporal. El código no puede reconstruirlos; deben volver a cargarse desde el archivo original del usuario.

## 2. Agregar ejercicios manualmente

En la vista de plan personal se incorporó una herramienta para:

- Buscar por nombre del ejercicio.
- Buscar por músculo.
- Buscar por equipo.
- Consultar el catálogo Imperial, API y base abierta.
- Excluir automáticamente ejercicios incompatibles con limitaciones activas.
- Definir series, repeticiones y descanso.
- Agregar el ejercicio únicamente al día seleccionado.
- Evitar duplicados dentro del mismo día.
- Eliminar un ejercicio específico sin regenerar la rutina.
- Guardar el cambio en la rutina asignada existente o crearla si aún es un borrador.

La generación aleatoria continúa disponible, pero ya no es obligatoria para realizar un ajuste puntual.

## 3. Cálculo nutricional por objetivo

Se agregó `src/utils/nutritionTargets.ts` con una fuente única para calcular:

- Metabolismo basal estimado.
- Calorías de mantenimiento por nivel de actividad.
- Déficit moderado para pérdida de grasa.
- Superávit prudente para hipertrofia o ganancia muscular.
- Ajuste específico para fuerza.
- Proteína diaria según peso, masa magra y objetivo.
- Grasas mínimas.
- Carbohidratos como energía restante.

Objetivos implementados:

| Objetivo | Ajuste inicial |
|---|---:|
| Pérdida de grasa | -15 % sobre mantenimiento |
| Hipertrofia / ganancia muscular | +8 % sobre mantenimiento |
| Fuerza | +5 % sobre mantenimiento |
| Mantenimiento / rendimiento | 0 % |

Estos valores son un punto inicial de planificación y deben ajustarse con la evolución real, adherencia y criterio profesional.

## 4. Totales por comida y por día

Ahora la interfaz calcula con los gramos seleccionados y los datos nutricionales por cada 100 g:

- Kilocalorías de cada alimento.
- Proteínas de cada alimento.
- Carbohidratos de cada alimento.
- Grasas de cada alimento.
- Total de cada comida.
- Total consumido del día.
- Calorías faltantes o excedentes.
- Diferencia porcentual frente al objetivo.
- Estado: dentro del objetivo, cercano o fuera del rango.

Los alimentos manuales ya no reciben macronutrientes inventados. Se solicita proteína, carbohidratos, grasa y kcal por 100 g y se comprueba su coherencia aproximada mediante la relación 4/4/9.

## 5. Validación en frontend y backend

- El frontend bloquea el guardado de un plan diario que se desvíe más de 20 % del objetivo.
- El backend vuelve a calcular las comidas a partir de los datos reales y rechaza menús diarios con desviación superior al 25 %.
- Los borradores parciales de una o dos comidas pueden guardarse para permitir sustituciones progresivas.
- El backend valida números finitos, no negativos y porciones máximas razonables.
- Se valida la coherencia entre calorías objetivo y macronutrientes objetivo.

## 6. Archivos principales modificados

### Backend

- `backend/app/core/uploads.py`
- `backend/app/core/private_files.py`
- `backend/app/core/nutrition.py`
- `backend/app/routers/progress.py`
- `backend/app/routers/memberships.py`
- `backend/app/routers/nutrition.py`
- `backend/app/schemas.py`
- `backend/scripts/migrate_private_media_to_cloudinary.py`

### Frontend

- `src/components/PersonalPlanView.tsx`
- `src/components/MembershipView.tsx`
- `src/services/progressService.ts`
- `src/services/membershipService.ts`
- `src/utils/nutritionTargets.ts`

### Pruebas

- `backend/tests/test_private_media.py`
- `backend/tests/test_nutrition_totals.py`
- `backend/tests/test_security_operations.py`
- `src/utils/nutritionTargets.test.ts`

## 7. Validaciones ejecutadas

- TypeScript: aprobado.
- Pruebas frontend: 19 aprobadas.
- Compilación Vite de producción: aprobada.
- Pruebas backend: 45 aprobadas.
- Compilación sintáctica de Python: aprobada.
- Revisión de diferencias Git: sin errores de espacios o formato.
- Escaneo interno de secretos: aprobado.
- Verificador interno de preparación: aprobado para validación controlada.

## 8. Orden de despliegue

1. Realizar copia de seguridad de la base de datos de Supabase.
2. Desplegar primero el backend corregido en Render.
3. Confirmar en Render:
   - `STORAGE_MODE=cloudinary`
   - `CLOUDINARY_URL` o credenciales equivalentes.
   - `SIGNED_URL_EXPIRE_SECONDS=600`.
4. Ejecutar la migración primero sin `--apply`.
5. Revisar todos los registros `MISSING` y `UNSUPPORTED`.
6. Ejecutar la migración con `--apply`.
7. Probar una fotografía y un comprobante nuevos.
8. Desplegar el frontend corregido en Vercel.
9. Probar búsqueda manual, agregado y eliminación de ejercicios.
10. Probar planes de pérdida de grasa, hipertrofia y mantenimiento verificando totales diarios.

## 9. Prueba de aceptación mínima

- Una foto subida continúa visible después de un nuevo despliegue de Render.
- La base de datos guarda `cloudinary-auth://...`.
- Una URL temporal expira según la configuración.
- Un cliente no puede registrar un comprobante perteneciente a otro cliente.
- Se puede agregar un ejercicio al miércoles sin modificar lunes ni viernes.
- Un plan de pérdida de grasa queda por debajo del mantenimiento.
- Un plan de hipertrofia queda por encima del mantenimiento.
- Cada comida muestra su total y el día muestra el total acumulado.
- Un menú excesivamente alejado del objetivo es rechazado.

# ACTUALIZACIÓN v1.11.0 — ORDEN DE RUTINA, GENERADOR MUSCULAR Y SUSTITUCIONES

## 10. Orden manual de ejercicios

- Al agregar un ejercicio se puede elegir la posición exacta: 1, 2, 3, etc.
- Cada ejercicio muestra su número de orden.
- Se agregaron botones para subir y bajar ejercicios sin regenerar el día.
- Cada cambio de orden se persiste mediante la API de rutinas asignadas.

## 11. Modo Cuidado sin bloqueo molesto

- Se eliminó el botón obligatorio “Sin limitaciones activas”.
- Ya no es necesario confirmar manualmente la ausencia de limitaciones para agregar, ordenar, cambiar o generar ejercicios.
- Las limitaciones realmente registradas continúan filtrando ejercicios incompatibles.
- Las limitaciones de severidad alta continúan bloqueando la generación automática por seguridad.

## 12. Generación por músculo corregida

- El generador usa primero `primaryMuscle` y `muscleGroups` en lugar de depender del texto del nombre.
- “Jalón al pecho” ya no puede clasificarse como ejercicio de pecho cuando su músculo principal es dorsal o espalda.
- Un día personalizado de pecho selecciona únicamente ejercicios del bucket de pecho.
- Se eliminó la ampliación accidental por split que permitía incluir hombro/tríceps u otros músculos fuera del objetivo específico.

## 13. Prioridad de ejercicios abiertos y máquinas

- Cuando la fuente es “Todas”, los ejercicios de `free-exercise-db` reciben prioridad.
- Dentro de la base abierta se priorizan máquinas, poleas, cables, Smith, prensa, peck deck y equipos equivalentes.
- La misma prioridad se aplica a los reemplazos selectivos y a la búsqueda manual.
- Si la base abierta no está disponible, el catálogo Imperial continúa funcionando como respaldo.

## 14. Sustituciones alimentarias según kcal objetivo

- Antes de sustituir se calcula el total diario sin el alimento original.
- Se determina cuántas kcal quedan disponibles dentro del objetivo ya calculado para pérdida de grasa, hipertrofia, fuerza o mantenimiento.
- La porción del sustituto se reduce automáticamente cuando la equivalencia por macros superaría el objetivo diario.
- Cada opción muestra el total diario proyectado antes de confirmar.
- Las opciones que respetan el objetivo y tienen mejor similitud nutricional aparecen primero.
- El backend acepta `max_substitute_calories` y vuelve a limitar la porción para evitar depender únicamente del navegador.
- Si no queda margen calórico, la sustitución se bloquea y solicita reducir otra porción.

## 15. Validación v1.11.0

- TypeScript: aprobado.
- Pruebas frontend: 22 aprobadas.
- Pruebas específicas nuevas: clasificación pecho/espalda, prioridad base abierta/máquinas y límite calórico de sustitución.
- Compilación Vite: aprobada.
- Pruebas backend: 45 aprobadas.
- Escaneo de secretos: aprobado.
- Verificador de lanzamiento: aprobado.
- Versión frontend, backend y Sentry unificada en `1.11.0`.

## 16. Base de datos

Esta actualización no crea tablas ni columnas nuevas. No se debe ejecutar SQL adicional en Supabase. El despliegue requiere actualizar backend en Render y frontend en Vercel.
