# Instrucciones para reemplazar en GitHub - Etapa 2

Este paquete corresponde a la etapa 2 del lanzamiento: mejoras de cliente, administrador, vista móvil, rutina e InBody.

## Carpetas a reemplazar completas

Reemplaza estas carpetas en tu repositorio:

```text
src/
backend/
dist/
```

Aunque la etapa 2 modificó principalmente frontend, se incluye `backend/` para mantener el paquete completo y consistente con la etapa 1.

## Archivos raíz a reemplazar

```text
package.json
package-lock.json
index.html
CHECKLIST_LANZAMIENTO_LUNES.md
REPORTE_AUDITORIA_CORRECCIONES_MOVIL_INBODY_TIMER.md
REPORTE_ETAPA_2_DOMINGO_CLIENTE_ADMIN_MOVIL.md
```

## Archivos principales modificados en esta etapa

```text
src/components/DashboardView.tsx
src/components/ClientsView.tsx
dist/index.html
```

## Pasos recomendados

1. Crea una rama en GitHub llamada `etapa-2-lanzamiento`.
2. Reemplaza las carpetas y archivos indicados.
3. Sube cambios a GitHub.
4. Espera el deploy automático o ejecuta:

```bash
npm install
npm run build
```

5. Prueba desde celular y escritorio.

## Pruebas mínimas

- Entrar como cliente.
- Revisar dashboard cliente.
- Revisar tarjetas: entreno de hoy, timer y medidas InBody.
- Abrir rutina completa.
- Abrir timer.
- Abrir medidas corporales.
- Entrar como admin.
- Revisar panel operativo.
- Entrar a clientes y validar tarjetas con datos InBody.
