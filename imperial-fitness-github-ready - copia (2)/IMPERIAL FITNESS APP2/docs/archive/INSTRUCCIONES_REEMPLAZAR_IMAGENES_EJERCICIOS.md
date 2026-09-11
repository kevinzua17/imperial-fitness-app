# INSTRUCCIONES — Reemplazar imágenes de ejercicios en GitHub

Este paquete contiene únicamente las imágenes de ejercicios recortadas.

## Si tu proyecto se despliega desde código fuente

Reemplaza esta carpeta en GitHub:

```text
public/exercises/
```

Luego deja que Vercel, Netlify o tu hosting hagan el build automáticamente.

## Si tú subes manualmente la versión compilada

Reemplaza esta carpeta:

```text
dist/exercises/
```

## Recomendación segura

Para no fallar, reemplaza ambas carpetas:

```text
public/exercises/
dist/exercises/
```

No necesitas reemplazar `src/`, `backend/` ni `package.json` para este cambio.

## Después de reemplazar

Revisa desde celular:

1. Abrir rutina asignada.
2. Ver varias imágenes de ejercicios.
3. Tocar una imagen para verla completa.
4. Confirmar que ya no aparezca la barra superior del celular ni la barra inferior de botones.
