# Hotfix: Base abierta de ejercicios visuales

Fecha: 2026-06-25

## Objetivo

Agregar una primera integración reversible con una base abierta de ejercicios para enriquecer la biblioteca visual de Imperial Fitness sin tocar Supabase.

## Fuente integrada

- Repositorio: yuhonas/free-exercise-db
- Dataset: `dist/exercises.json`
- Imágenes: `exercises/<id>/<imagen>.jpg`
- Licencia declarada por el repositorio: Unlicense / dominio público

## Qué se implementó

- Servicio frontend `openExerciseDbService.ts`.
- Carga opcional desde `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`.
- Transformación de ejercicios abiertos a `ExerciseCatalogItem`.
- Traducción básica de músculos y equipos al español.
- Inferencia automática de segmento y patrón de movimiento.
- Cache local por 7 días para evitar recargar siempre el dataset.
- Fallback seguro: si GitHub/raw no responde, la app usa el catálogo Imperial existente.
- Filtro nuevo en Biblioteca de ejercicios: todas las fuentes, Imperial Fitness o base abierta.
- Límite visual de 120 tarjetas renderizadas para mantener rendimiento móvil.

## Variables nuevas de frontend

```env
VITE_ENABLE_OPEN_EXERCISE_DB=true
VITE_OPEN_EXERCISE_DB_URL=https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
VITE_OPEN_EXERCISE_IMAGE_PREFIX=https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/
VITE_OPEN_EXERCISE_TIMEOUT_MS=9000
```

## Riesgos controlados

- No se ejecutó SQL.
- No se modificó Supabase.
- No se guardaron ejercicios abiertos en base de datos.
- No se reemplazó el catálogo Imperial.
- La integración se puede apagar con `VITE_ENABLE_OPEN_EXERCISE_DB=false`.

## Próximo paso recomendado

Cuando esta integración sea aprobada visualmente, crear un importador local que descargue y versione solo los ejercicios/imágenes elegidos para no depender de raw.githubusercontent.com en producción final.
