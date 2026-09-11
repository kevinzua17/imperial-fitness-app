# Imperial Fitness v1.12.0 — Informe técnico de cambios

Fecha de entrega: 21 de julio de 2026

## 1. Diagnóstico realizado antes de modificar

Se revisaron la arquitectura React/TypeScript, los servicios de API, la generación y edición de rutinas, el catálogo de ejercicios, la visualización de usuarios, la base alimentaria, el backend FastAPI, las migraciones de Supabase y el flujo de carga de imágenes.

### Hallazgos principales

1. **Rutinas sin módulos visibles.** Los ejercicios tenían datos de grupo muscular y segmento, pero no existía un campo de bloque consistente para presentar una sesión como Calentamiento, Pecho, Tríceps, Espalda, etc.
2. **El calentamiento no era un bloque operativo.** Algunas rutinas incluían orientación general, pero no tres ejercicios de preparación integrados en la sesión generada.
3. **Buscador manual poco identificable.** Los resultados del buscador mostraban principalmente nombre y metadatos; la imagen no estaba integrada como miniatura visible en cada resultado.
4. **Fotos de perfil sin ampliación uniforme.** Varias pantallas mostraban avatares pequeños sin una forma común de abrir la fotografía completa.
5. **Base alimentaria insuficiente para el contexto colombiano.** La fuente local tenía 134 alimentos y necesitaba más opciones de consumo cotidiano y productos típicos disponibles en D1, Ara, Éxito y comercios similares.
6. **Carga futura de fotografías de alimentos.** La capacidad ya existía en la aplicación: permite subir un archivo o guardar una URL, con persistencia por backend y compatibilidad con Cloudinary. Se conservó y se verificó para los nuevos alimentos.
7. **Demora al recibir dieta o rutina asignada.** La causa estaba en dos puntos del frontend: las consultas GET podían devolver durante unos segundos una respuesta en caché y el cliente conectado no volvía a consultar automáticamente cuando el entrenador hacía una asignación desde otra sesión o dispositivo. La creación de la asignación en backend no presentó fallos en las pruebas.

## 2. Cambios implementados

### Rutinas por módulos

- Se incorporó el campo opcional `block` en cada ejercicio.
- Se creó inferencia automática para clasificar ejercicios en: Calentamiento, Pecho, Espalda, Hombros, Bíceps, Tríceps, Cuádriceps, Glúteos, Femoral/Isquiotibiales, Pantorrillas, Core/Abdomen, Cardio, Movilidad, Cuerpo completo u Otro.
- Las nuevas rutinas se generan con tres ejercicios reales de calentamiento:
  - activación cardiovascular suave;
  - movilidad dinámica específica para el enfoque del día;
  - series de aproximación del primer ejercicio.
- La interfaz muestra encabezados de módulo dentro de cada día.
- El entrenador puede cambiar manualmente el módulo de cualquier ejercicio y el cambio queda guardado dentro de la rutina.
- Al agregar un ejercicio manualmente se puede seleccionar su módulo o permitir la clasificación automática.
- Las rutinas antiguas continúan siendo compatibles: sus módulos se infieren y, cuando no tienen calentamiento guardado, aparece una preparación recomendada.

### Imágenes de ejercicios

- Cada resultado del buscador manual incluye una miniatura del ejercicio.
- La miniatura se puede pulsar para abrir la imagen completa.
- Se mantienen imágenes inicial/final, alternativas, animaciones o video cuando el catálogo dispone de esos medios.

### Fotografías de perfiles

Se añadió un visor común de avatar ampliable en:

- clientes;
- administración de usuarios;
- chat;
- perfil;
- dashboard;
- comunidad;
- vista de planes personales.

La foto se abre en un modal de gran tamaño y conserva una imagen de respaldo si la URL original falla.

### Alimentos de Colombia

- Base anterior: **134 alimentos**.
- Base actual: **213 alimentos**.
- Nuevos registros: **79**.

Se agregaron, entre otros, pollo desmechado, carne para sudar, hígado, chuleta, sardinas, merluza, jamón, salchicha, mortadela, fríjol cargamanto, fríjol rojo, garbanzo, arepas, harina de maíz, panes, galletas de soda, pasta, quinua, ñame, arracacha, papa pastusa, plátano maduro, patacón, granola, cereales, leches, yogures, kumis, quesos, mantequilla, margarina, mayonesa, maní, frutas, verduras, agua de panela, gaseosas, jugos envasados, chocolate de mesa y snacks comunes.

Los valores son referenciales por 100 g. Para productos empacados, la etiqueta nutricional de la marca debe prevalecer porque D1, Ara y Éxito comercializan referencias con formulaciones variables.

### Fotografías de alimentos

No fue necesario crear un segundo sistema. La versión conserva el flujo ya disponible para:

- subir una fotografía desde el dispositivo;
- asociar una URL HTTPS de Cloudinary;
- guardar una ruta local permitida;
- mantener una previsualización local cuando el backend no esté disponible.

Los 79 alimentos nuevos usan el mismo mecanismo y podrán recibir fotografías progresivamente desde la administración del plan.

### Sincronización de asignaciones

- Las consultas de la dieta y rutina activas del cliente ahora se ejecutan con `cache: no-store`.
- Una lectura fresca ya no borra innecesariamente toda la caché de la aplicación; las mutaciones sí la invalidan.
- Al iniciar la sesión del cliente se realiza una lectura inmediata.
- Mientras la app está visible, dieta y rutina se actualizan cada 4 segundos.
- También se actualizan al volver a la pestaña, recuperar el foco o restablecer la conexión.
- El estado solo se reemplaza cuando el contenido realmente cambió, evitando renderizados y sobrescrituras innecesarias.

Este mecanismo entrega sincronización casi inmediata entre dispositivos sin introducir WebSockets ni nuevas dependencias de infraestructura.

## 3. Archivos principales modificados

- `src/App.tsx`
- `src/components/PersonalPlanView.tsx`
- `src/components/ZoomableAvatar.tsx` (nuevo)
- `src/components/ClientsView.tsx`
- `src/components/UserManagementView.tsx`
- `src/components/ChatView.tsx`
- `src/components/ProfileView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/SocialWallView.tsx`
- `src/data/gymProgramming.ts`
- `src/data/gymProgramming.test.ts`
- `src/data/mockData.ts`
- `src/data/foodDatabase.ts`
- `src/utils/routineBlocks.ts` (nuevo)
- `src/services/api.ts`
- `src/services/nutritionService.ts`
- `src/services/routineService.ts`
- `backend/supabase/migrations/030_colombian_supermarket_foods.sql` (nuevo)
- `backend/app/main.py`
- `package.json`
- `package-lock.json`

## 4. Validación técnica

Resultados finales:

- TypeScript: aprobado, sin errores.
- Frontend: 8 archivos de prueba aprobados.
- Frontend: 22 pruebas aprobadas.
- Backend: 45 pruebas aprobadas.
- Compilación Vite de producción: aprobada.
- Escaneo de secretos: aprobado.
- Verificación de preparación de producción: aprobada.
- Parser alimentario del backend: 213 alimentos reconocidos.

El backend produjo advertencias de deprecación en dependencias externas (`python-json-logger` y `python-jose`), pero no errores ni pruebas fallidas. Conviene atenderlas en una actualización futura de dependencias; no bloquean este despliegue.

## 5. Orden recomendado de actualización

1. **GitHub:** descomprimir esta entrega, sustituir el contenido del repositorio, revisar el commit y hacer `push`.
2. **Supabase:** ejecutar en SQL Editor el archivo `backend/supabase/migrations/030_colombian_supermarket_foods.sql`. La migración es idempotente: actualiza coincidencias por nombre, agrega faltantes y conserva los IDs existentes.
3. **Render:** desplegar el backend desde el nuevo commit. No se agregaron variables de entorno.
4. **Vercel:** desplegar el frontend desde el mismo commit.
5. **Cloudinary:** no requiere cambios de configuración ni migraciones. Se usa la integración ya existente para fotos de alimentos y perfiles.

## 6. Comprobación después del despliegue

- Crear o usar un cliente de prueba aceptado.
- Mantener abierta su sesión en otro navegador o dispositivo.
- Asignar una dieta y una rutina desde el perfil del entrenador.
- Confirmar que aparecen en la sesión del cliente dentro de aproximadamente 0 a 4 segundos, sin cerrar sesión.
- Generar una rutina nueva y verificar los módulos Calentamiento y grupos musculares.
- Buscar un ejercicio manualmente, abrir su miniatura y cambiar su módulo.
- Abrir fotografías de clientes desde las pantallas indicadas.
- Buscar alimentos como “Arepa”, “Kumis”, “Fríjol cargamanto” o “Agua de panela”.
- Subir una fotografía de alimento y confirmar la URL persistida en el backend/Cloudinary.

## 7. Compatibilidad e infraestructura

- No se añadió ninguna dependencia de frontend o backend.
- No se modificó el esquema de rutinas: el nuevo campo `block` se almacena dentro del JSON de la rutina existente.
- No se requieren cambios en las tablas de dietas o usuarios.
- La única operación de datos necesaria es la migración 030 de alimentos.
- La versión de entrega quedó actualizada a **1.12.0**.
