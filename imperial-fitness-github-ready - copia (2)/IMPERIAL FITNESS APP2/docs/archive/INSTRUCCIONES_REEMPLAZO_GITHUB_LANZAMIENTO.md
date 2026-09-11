# Instrucciones para reemplazar en GitHub - Lanzamiento Imperial Fitness

Este paquete contiene únicamente las carpetas y archivos que debes subir/reemplazar en tu repositorio para aplicar las correcciones de la etapa de hoy.

## 1. Carpetas que debes reemplazar completas

Reemplaza en GitHub estas carpetas por las que vienen en este paquete:

```text
src/
backend/
dist/
```

### ¿Qué contiene cada carpeta?

- `src/`: contiene las mejoras del frontend: login con carga, timer con sonido fuerte, encuesta diaria responsive, rutina asignada más visible, progreso/InBody y ajustes móviles.
- `backend/`: contiene los cambios de usuarios, edad, género, estatura, parámetros corporales, esquemas, rutas y migración Supabase.
- `dist/`: contiene la versión compilada de producción. Úsala si tu despliegue toma archivos ya construidos.

## 2. Archivos raíz que también debes reemplazar

Además de las carpetas anteriores, reemplaza estos archivos si existen en tu repositorio:

```text
package.json
package-lock.json
index.html
REPORTE_AUDITORIA_CORRECCIONES_MOVIL_INBODY_TIMER.md
CHECKLIST_LANZAMIENTO_LUNES.md
```

## 3. Migración importante de base de datos

Si ya tienes la base de datos creada en Supabase, ejecuta esta migración:

```text
backend/supabase/migrations/018_user_demographics_inbody.sql
```

Esta migración agrega/ajusta campos necesarios para edad, género, estatura y datos corporales.

## 4. Después de subir a GitHub

Si tu hosting construye automáticamente el proyecto, asegúrate de que ejecute:

```bash
npm install
npm run build
```

Si tú subes manualmente la carpeta `dist`, entonces usa el `dist/` que viene dentro de este paquete.

## 5. Pruebas mínimas antes del lanzamiento

Antes de publicar el lunes, prueba:

- Login con usuario admin.
- Login con usuario cliente.
- El ojo para ver/ocultar contraseña.
- El estado de carga al entrar.
- Timer con sonido fuerte y conteo 3, 2, 1.
- Cambio de ENTRENO a DESCANSO.
- Encuesta diaria en celular.
- Rutina asignada desde celular.
- Registro/actualización de edad, género, estatura, peso e InBody.
- Dashboard sin pantallas cortadas.

## 6. Recomendación

Haz primero una rama nueva en GitHub, por ejemplo:

```text
lanzamiento-lunes
```

Sube estos cambios allí, prueba el despliegue y luego une a `main` cuando confirmes que todo está correcto.
