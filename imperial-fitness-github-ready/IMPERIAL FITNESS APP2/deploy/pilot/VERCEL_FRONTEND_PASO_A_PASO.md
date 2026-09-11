# Vercel / Netlify - despliegue del frontend

## 1. Crear proyecto

Crear un proyecto nuevo y conectar la carpeta raíz del frontend.

## 2. Build

Usar:

```bash
npm install
npm run build
```

Output directory:

```txt
dist
```

## 3. Variables

Copiar desde:

```txt
deploy/pilot/vercel.env.example
```

La variable principal es:

```env
VITE_API_BASE_URL=https://TU-BACKEND.onrender.com
```

## 4. Validar

Abrir la URL del frontend desde celular y probar:

- Login.
- Registro.
- Navegación.
- Rutinas.
- Dietas.
- Progreso.
- Fotos.

## 5. Importante

Cada vez que cambies `VITE_API_BASE_URL`, debes volver a desplegar el frontend.
