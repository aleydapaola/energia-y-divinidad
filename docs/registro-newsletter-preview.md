# Registro y newsletter — Preview, 03/11/2026

Plan aprobado por Xavier: casilla opcional desmarcada con novedades y regalo;
activar la newsletter solo al verificar la cuenta, sin una segunda confirmación.
Toda modificación debe funcionar y verificarse primero en Preview. Esta
aprobación no autoriza publicar en Production.

## Comportamiento

- El registro guarda fecha, origen, versión y texto del consentimiento únicamente
  con `newsletterOptIn: true`. La cuenta se puede crear sin suscribirse.
- La verificación consume el token y habilita el trabajo pendiente de forma
  transaccional. El envío de bienvenida y la newsletter no impiden activar la cuenta.
- Mailchimp sigue gestionando el estado real. Un alta nueva verificada se crea como
  subscribed; un contacto pending puede activarse con esta nueva autorización.
  Unsubscribed, cleaned y otros estados inactivos requieren reinscripción externa.
- El regalo reutiliza Resend, el mismo diseño/logo y la clave de deduplicación por
  audiencia, email y versión de regalo. La entrada interna exige consentimiento
  registrado y cuenta verificada; el webhook mantiene firma y validación originales.
- Los errores quedan pendientes de reintento. El cron diario existente revisa hasta
  tres solicitudes, y ADMIN Comunicaciones permite repetir la revisión. Respuestas
  inciertas antiguas de Resend conservan el estado de revisión manual; no se repiten
  fuera de la ventana de deduplicación. Preview no ejecuta cron automáticamente:
  utilizar el control ADMIN para comprobar recuperación sin procesar campañas.
- La integración puede pausarse con REGISTRATION_NEWSLETTER_ENABLED=false. No borra
  consentimientos ni contactos; se conserva la referencia del despliegue anterior.

## Protección y configuración

Turnstile Free administrado, sin pre-clearance ni cambios de DNS. Widget propio
«EYD Preview — Registro y newsletter», cuenta contacto@energiaydivinidad.com.
Solo admite preview.energiaydivinidad.com y el alias Git Preview verificado.

Variables nuevas exclusivamente Preview/gitBranch preview:
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, AUTH_RATE_LIMIT_SECRET y
REGISTRATION_NEWSLETTER_ENABLED. Secretos fuera de Git e informes. Production
no admite claves oficiales dummy. El perfil local acepta únicamente claves
Turnstile dummy, conservando el bloqueo de credenciales externas reales.

Registro y reenvío: Turnstile validado en servidor (dominio y acción), campo trampa,
cinco solicitudes/IP/15 minutos por ruta. Correos de verificación: límite compartido
de uno/minuto y tres/hora por email. Verificación: 30/IP/15 minutos. Newsletter
independiente: cinco/IP/15 minutos y tres/email/hora, manteniendo doble opt-in.
Contadores atómicos en Neon, identificadores HMAC, sin emails/IP en claro; retirada
diaria de contadores caducados. Un fallo de protección bloquea el envío con opción
de reintentar conservando los campos. No se garantiza eliminar todo el abuso.

Migración aditiva: 20261103070000_registration_newsletter; tablas nuevas de
consentimiento/trabajo y contadores. Aplicada solo a Neon Preview verificada.
No migra usuarios anteriores ni cambia permisos de marketing de otros sistemas.

## Verificaciones y estado

- Suite automática: 232 pruebas, tipos correctos y lint sin errores (avisos
  documentados en los archivos existentes y expresiones de estados).
- Prueba real en Neon Preview: 12 peticiones concurrentes, cinco admitidas y siete
  rechazadas; ocho reclamaciones del mismo trabajo, una única concesión. Sin llamadas
  de correo/proveedores y fixtures propias retiradas.
- Xavier autoriza temporalmente aleydapaola+registro20261103@proton.me para una
  nueva alta de pruebas. Restaurar aleydapaola@proton.me al finalizar, reconstruir
  Preview y cotejar el ámbito; conservar cuenta, reservas y regalo QA anteriores.
- Pendientes en este punto: despliegue Ready/SHA/alias; navegador con widget real;
  alta nueva, verificación, suscripción y recepción del regalo; restauración del
  destinatario; revisión final de Production sin cambios. No dar estas pruebas por
  realizadas a partir de las pruebas simuladas.

Evidencias operativas privadas en .local-private/registration-newsletter-2026-11-03/.
No ejecutar compras, campañas, cancelaciones ni devoluciones para esta verificación.
