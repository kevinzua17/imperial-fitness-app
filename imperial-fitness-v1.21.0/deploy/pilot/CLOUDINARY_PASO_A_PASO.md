# Cloudinary - paso a paso

Cloudinary guardará imágenes como fotos de perfil, avances físicos y recursos multimedia.

## 1. Crear cuenta

1. Crear cuenta en Cloudinary.
2. Entrar al Dashboard.
3. Copiar el valor de `CLOUDINARY_URL`.

Formato:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

## 2. Pegar en el backend

Pegar en Render/Railway:

```env
STORAGE_MODE=cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

## 3. Probar

Después del despliegue, subir una foto desde la app. Si se guarda correctamente, el storage está funcionando.

## 4. Recomendación

No guardar imágenes grandes sin compresión. Para 500 usuarios, conviene limitar imágenes a menos de 8 MB y preferir JPG/WebP.
