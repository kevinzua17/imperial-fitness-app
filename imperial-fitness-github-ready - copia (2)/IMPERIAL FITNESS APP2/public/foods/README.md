# Repositorio visual de alimentos - Imperial Fitness

Esta carpeta contiene las imágenes base usadas por la vista de nutrición.
Son ilustraciones propias generadas para la app, sin emojis y sin depender de terceros.

## Cómo agregar imágenes reales propias
1. Sube la imagen a esta carpeta o a un CDN/Cloudinary.
2. Desde la app, entra como admin/entrenador a Planes > Base Nutricional Profesional.
3. Abre "Imagen del alimento" en el alimento correspondiente.
4. Pega la ruta, por ejemplo `/foods/custom/arroz-blanco.jpg`, o una URL https.
5. Guarda.

Los cambios guardados desde admin se almacenan en la configuración de medios del backend usando `app_settings`, sin crear columnas nuevas ni tocar la estructura de Supabase.
