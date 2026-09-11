# Corrección Render - gamification.py

## Problema detectado
Render fallaba al levantar el backend con:

`TypeError: unsupported operand type(s) for |: 'NoneType' and 'NoneType'`

`Unable to evaluate type annotation 'date | None'`

El problema estaba en `backend/app/routers/gamification.py`, clase `HabitCompletionRequest`.

Con `from __future__ import annotations`, Pydantic evaluaba el campo `date: date | None = None` y confundía el nombre del campo `date` con el tipo `datetime.date`.

## Corrección aplicada
Se cambió:

```python
from datetime import date, timedelta
```

por:

```python
from datetime import date as dt_date, timedelta
```

Y se actualizaron las anotaciones:

```python
date: dt_date | None = None
target_date: dt_date | None = None
```

También se ajustaron `_today()` y `_as_iso()` para usar `dt_date`.

## Validación
Se validó la importación aislada de `app.routers.gamification` con stubs de dependencias externas y Pydantic ya reconoce correctamente:

```python
datetime.date | None
```

## Qué hacer en Render
Volver a subir este ZIP/código y redeployar el backend.
