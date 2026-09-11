# Migración de fotos y comprobantes privados

## Qué cambia

Las nuevas fotos de progreso y los nuevos comprobantes se cargan en Cloudinary con `type=authenticated`. La base de datos conserva una referencia opaca `cloudinary-auth://...`; nunca se guarda una URL pública. La API genera un enlace temporal solo después de verificar que el solicitante sea el cliente propietario, su entrenador asignado o un administrador autorizado.

## Variables necesarias en Render

- `STORAGE_MODE=cloudinary`
- `CLOUDINARY_URL` o las tres variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SIGNED_URL_EXPIRE_SECONDS=600` (o un valor breve equivalente)

## Migrar lo existente

Desde Shell de Render, dentro de `backend`:

```bash
python scripts/migrate_private_media_to_cloudinary.py
python scripts/migrate_private_media_to_cloudinary.py --apply
```

La primera ejecución es un diagnóstico sin cambios. Los archivos marcados como `MISSING` ya no existen en el disco temporal y no pueden recuperarse desde el código: deben volver a ser cargados por el usuario. Los comprobantes públicos antiguos que todavía respondan por URL se copiarán al almacenamiento autenticado. Después de comprobar la migración, los originales públicos pueden eliminarse manualmente en Cloudinary.

## Verificación posterior

1. Subir una foto de progreso y un comprobante nuevos.
2. Confirmar que la base guarde `cloudinary-auth://...` y no `https://res.cloudinary.com/...`.
3. Abrirlos desde la app autenticada.
4. Copiar el enlace temporal en una ventana privada y comprobar que expira.
5. Desplegar nuevamente en Render y confirmar que la foto continúa disponible.
