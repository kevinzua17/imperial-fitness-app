# Imperial Fitness - Piloto barato de producción

Esta carpeta deja preparado el camino para sacar la app de entorno local y probarla con clientes reales del gym sin pagar infraestructura grande desde el primer día.

## Objetivo del piloto

Probar la app con 10 a 20 usuarios reales antes de abrirla a 500 clientes.

Usuarios sugeridos para la prueba:

- 1 administrador del gym.
- 1 a 2 entrenadores.
- 10 a 20 clientes.

## Arquitectura recomendada para el piloto

| Componente | Servicio recomendado | Uso |
|---|---|---|
| Frontend web | Vercel o Netlify | Publicar la interfaz React/Vite |
| Backend API | Render o Railway | Ejecutar FastAPI |
| Base de datos | Supabase PostgreSQL | Guardar usuarios, rutinas, dietas, progreso |
| Archivos/fotos | Cloudinary | Guardar imágenes de perfil y progreso |
| Redis | Upstash Redis | Rate limit/cache para evitar abuso |
| Correo SMTP | Brevo, Gmail App Password o dominio propio | Recuperación de contraseña y notificaciones |
| APK Android | Capacitor + Android Studio | App instalable para clientes Android |

## Orden correcto de implementación

1. Crear proyecto en Supabase.
2. Ejecutar el SQL de `deploy/pilot/supabase/00_RUN_ALL_IN_SUPABASE.sql`.
3. Crear cuenta Cloudinary y obtener `CLOUDINARY_URL`.
4. Crear Redis en Upstash y obtener `REDIS_URL`.
5. Crear SMTP en Brevo/Gmail y obtener usuario/clave.
6. Desplegar backend en Render/Railway usando `deploy/pilot/render.env.example`.
7. Desplegar frontend en Vercel/Netlify usando `deploy/pilot/vercel.env.example`.
8. Probar `/health` del backend.
9. Probar login/registro/rutinas/dietas/progreso/fotos desde celular.
10. Generar APK Android con Capacitor.

## Importante

Los archivos `.example` son plantillas. No tienen claves reales. No subas tus claves privadas a GitHub ni las pegues en el frontend.

La variable `DATABASE_URL`, `SECRET_KEY`, `SMTP_PASSWORD`, `CLOUDINARY_URL` y `REDIS_URL` deben ir solo en el backend.

## Criterio para pasar de piloto a 500 usuarios

Antes de abrir la app a 500 clientes, validar:

- 7 días de uso sin errores críticos.
- Recuperación de contraseña funcionando.
- Fotos subiendo correctamente a Cloudinary.
- Base de datos con respaldo activo.
- Backend sin dormirse o plan pago activo.
- APK probado en varios celulares Android.
- Tiempo de carga aceptable en red móvil.
- Rol administrador/entrenador/cliente funcionando sin cruces de permisos.

## Proyecto Supabase del piloto

Se registró esta URL pública del proyecto:

```env
SUPABASE_URL=https://vaaeaqdbocfnfasiznyl.supabase.co
```

No se incluye `DATABASE_URL`, contraseña de base de datos ni `service_role_key` dentro del ZIP. Esas credenciales se configuran después como variables privadas en Render/Railway.
