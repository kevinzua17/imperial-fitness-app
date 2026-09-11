# Imperial Fitness Platform Hardening

## Security headers

Backend aplica:

- `Content-Security-Policy`
- `Strict-Transport-Security` en producción
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

Frontend Nginx también incluye headers equivalentes.

## Cloudflare CDN/WAF

Configurar dominio `imperialfitnesgym.com.co` en Cloudflare:

1. Agregar dominio en Cloudflare.
2. Cambiar nameservers en el registrador.
3. DNS:
   - `CNAME www -> cname.vercel-dns.com`
   - `A @ -> 76.76.21.21` si usas apex en Vercel
   - `CNAME api -> tu-backend.onrender.com` si usas subdominio API
4. SSL/TLS: Full (strict).
5. Activar Always Use HTTPS.
6. Activar Brotli.
7. WAF Rules recomendadas:
   - Bloquear países si aplica.
   - Rate limit `/auth/login`.
   - Managed rules OWASP.
   - Bot Fight Mode.
8. Cache Rules:
   - Cache estáticos `*.js`, `*.css`, `*.png`, `*.webp`, `*.svg`.
   - Bypass cache para `/api/*` o backend.

## Redis rate limiting

Producción exige:

```env
REDIS_URL=redis://...
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=90
```

El middleware usa Redis si está disponible y cae a memoria solo en local.

## Metrics y alertas

Endpoint Prometheus:

```text
GET /metrics
```

UptimeRobot:

- `/health/live`
- `/health/ready`

Alertas recomendadas:

- API down > 1 min.
- `/health/ready` falla.
- Latencia > 2s por 5 min.
- 5xx > 2%.
- Uso de CPU/memoria alto en Render.

## Producción segura

Variables obligatorias:

```env
APP_ENV=production
SECRET_KEY=...
DATABASE_URL=postgresql://...
STORAGE_MODE=cloudinary
CLOUDINARY_URL=...
REDIS_URL=...
ENABLE_HSTS=true
CORS_ORIGINS=https://imperialfitnesgym.com.co,https://www.imperialfitnesgym.com.co
TRUSTED_HOSTS=imperialfitnesgym.com.co,www.imperialfitnesgym.com.co,api.imperialfitnesgym.com.co
```