# Cloudinary backup strategy

Cloudinary no se respalda con `pg_dump`. Para producción usa una de estas opciones:

1. Activar backups/auto-backup desde el panel de Cloudinary si tu plan lo permite.
2. Exportar assets periódicamente con Admin API.
3. Mantener metadata de cada asset en PostgreSQL: public_id, secure_url, folder, resource_type.

Variables necesarias para scripts futuros:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Frecuencia recomendada:

- PostgreSQL: diario.
- Cloudinary assets: semanal para beta, diario en producción con muchos usuarios.