# Render / Railway - despliegue del backend

## 1. Crear servicio web

Crear un servicio tipo **Web Service** conectado al repositorio o subir el código.

## 2. Configuración

Usar:

```bash
Build command:
cd backend && pip install -r requirements.txt
```

```bash
Start command:
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 3. Variables

Copiar las variables desde:

```txt
deploy/pilot/render.env.example
```

Y reemplazar valores falsos por las claves reales de Supabase, Cloudinary, Redis y SMTP.

## 4. Validar

Cuando termine el deploy, abrir:

```txt
https://TU-BACKEND.onrender.com/health
```

Debe responder algo parecido a:

```json
{"status":"ok","service":"Imperial Fitness API","environment":"production"}
```

## 5. Problemas frecuentes

- Error de CORS: revisar que `CORS_ORIGINS` tenga la URL exacta del frontend.
- Error de TrustedHost: revisar que `TRUSTED_HOSTS` tenga el dominio del backend sin `https://`.
- Error de DATABASE_URL: revisar usuario, password, host y puerto de Supabase.
- Error de Cloudinary: revisar `CLOUDINARY_URL`.
- Error de SMTP: revisar usuario y contraseña SMTP.
