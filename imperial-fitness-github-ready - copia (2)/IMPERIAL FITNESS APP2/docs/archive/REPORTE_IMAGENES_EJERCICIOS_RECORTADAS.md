# REPORTE — Imágenes de ejercicios recortadas

## Objetivo
Eliminar de las imágenes de ejercicios los bordes de pantallazo de celular, especialmente:

- Barra superior con hora/fecha/notificaciones.
- Barra inferior de botones del celular.
- Controles inferiores del visor del pantallazo cuando aparecían en la imagen.

## Qué se hizo

Se procesaron las imágenes ubicadas en:

```text
public/exercises/
dist/exercises/
```

El recorte se aplicó principalmente a imágenes verticales tomadas como pantallazo de celular. Las imágenes horizontales o limpias se conservaron sin recorte para evitar dañarlas.

## Resultado

- Imágenes de ejercicios más limpias.
- Sin barra superior del teléfono.
- Sin barra inferior de navegación/botones.
- Ejercicios más grandes y claros dentro de la app.
- Mejor visual cuando el cliente toca la imagen para verla completa.

## Validación

Después de recortar las imágenes se ejecutó nuevamente el build de producción:

```bash
npm run build
```

Resultado: build generado correctamente.

## Nota

Este paquete no cambia la lógica de la app. Solo reemplaza imágenes de ejercicios y la carpeta compilada correspondiente.
