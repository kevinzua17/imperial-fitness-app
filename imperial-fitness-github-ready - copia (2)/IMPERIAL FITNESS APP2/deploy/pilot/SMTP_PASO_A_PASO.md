# SMTP - paso a paso

SMTP permite enviar correos de recuperación de contraseña y avisos.

## Opción recomendada para app real: Brevo

Variables típicas:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=usuario_smtp
SMTP_PASSWORD=password_smtp
SMTP_FROM_EMAIL=no-reply@tudominio.com
SMTP_FROM_NAME=Imperial Fitness
SMTP_USE_TLS=true
```

## Opción rápida para piloto: Gmail con contraseña de aplicación

Solo usar si la cuenta tiene verificación en dos pasos.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tucorreo@gmail.com
SMTP_PASSWORD=contraseña_de_aplicación
SMTP_FROM_EMAIL=tucorreo@gmail.com
SMTP_FROM_NAME=Imperial Fitness
SMTP_USE_TLS=true
```

## Validación

Probar recuperación de contraseña desde la pantalla de login. Si el correo llega, SMTP está correcto.
