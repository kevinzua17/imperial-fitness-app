# Instalación — Gamificación y retención Imperial Fitness

## 1. Supabase
Ejecutar en Supabase > SQL Editor:

```txt
deploy/pilot/supabase/06_AGREGAR_GAMIFICACION_RETENCION.sql
```

Esto crea las tablas:

- user_gamification_status
- user_streaks
- user_badges
- xp_events
- gamification_notifications
- user_mission_logs

## 2. Copiar archivos al proyecto local
Copiar estas carpetas del ZIP sobre el proyecto local:

```txt
backend
src
deploy
docs
```

Aceptar reemplazar cuando Windows lo pida.

## 3. GitHub Desktop
Hacer:

```txt
Commit: Agrego gamificación, rachas y retención
Push origin
```

## 4. Render
Como cambia backend, ejecutar:

```txt
Render > Manual Deploy > Clear build cache & deploy
```

Verificar que el backend quede live.

## 5. Vercel
Como cambia frontend, esperar deploy automático. Si no ocurre:

```txt
Vercel > Deployments > Redeploy without cache
```

## 6. Pruebas

### Cliente
1. Entrar como cliente.
2. Completar check-in diario.
3. Registrar agua/sueño/progreso/mental desde el panel de gamificación.
4. Revisar XP, monedas y rachas.

### Admin / entrenador
1. Entrar como admin.
2. Abrir Dashboard.
3. Revisar Panel interno de adherencia Imperial.
4. Ver clientes en riesgo y botón WhatsApp.

## 7. Nota de seguridad comercial
Los porcentajes y estados de riesgo se muestran solo a admin/entrenador. El cliente ve motivación, XP, rachas e insignias, pero no métricas comerciales sensibles.
