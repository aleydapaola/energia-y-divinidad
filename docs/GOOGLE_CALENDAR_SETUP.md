# Integración Google Calendar

La web sigue siendo la fuente oficial de reservas. Google Calendar se usa como espejo de consulta para que Aleyda pueda ver sus sesiones desde la cuenta `alepaola8523@gmail.com`.

## Preparación en Google Cloud

1. Crear o abrir un proyecto en Google Cloud.
2. Activar la API **Google Calendar API**.
3. Crear una **cuenta de servicio**.
4. Generar una clave JSON para esa cuenta de servicio.
5. Copiar el email de la cuenta de servicio.

## Compartir el calendario de Aleyda

Desde Google Calendar con la cuenta `alepaola8523@gmail.com`:

1. Abrir la configuración del calendario donde deben aparecer las sesiones.
2. Ir a **Compartir con personas o grupos específicos**.
3. Añadir el email de la cuenta de servicio.
4. Dar permiso **Hacer cambios en eventos**.

Para el calendario principal, el `GOOGLE_CALENDAR_ID` normalmente puede ser `alepaola8523@gmail.com`.

## Variables de entorno

Configurar en local y en Vercel:

```bash
GOOGLE_CALENDAR_ID="alepaola8523@gmail.com"
GOOGLE_SERVICE_ACCOUNT_EMAIL="nombre-cuenta-servicio@proyecto.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_TIME_ZONE="Europe/Madrid"
```

La clave privada debe conservar los saltos de línea como `\n` si se pega en una sola línea.

## Comportamiento

- Al confirmar una sesión pagada, con crédito o desde pack, la web crea el evento en Google Calendar.
- Al reprogramar la sesión en la web, se actualiza el evento de Google Calendar.
- Al cancelar la sesión en la web, se elimina el evento de Google Calendar.
- Si Google Calendar falla o no está configurado, la reserva no se bloquea. El error queda guardado en la reserva.
