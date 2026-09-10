# Redis / Upstash - paso a paso

Redis ayuda a controlar límites de peticiones y reduce abuso del backend.

## 1. Crear base Redis

1. Crear cuenta en Upstash.
2. Crear una base Redis nueva.
3. Elegir una región cercana a tus usuarios o al backend.
4. Copiar la URL de conexión Redis.

Ejemplo:

```env
REDIS_URL=redis://default:password@host:port
```

## 2. Pegar en backend

En Render/Railway:

```env
REDIS_URL=redis://default:password@host:port
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=90
```

## 3. Para piloto

Con 10 a 20 usuarios, el plan gratuito suele bastar. Para 500 usuarios se debe monitorear consumo.
