# Entrega de la meditación de bienvenida

La web conserva el alta de Mailchimp con doble confirmación. Un aviso firmado de
suscripción confirmada permite a Resend, el correo existente de EYD, entregar el
regalo. No se contrata otro servicio ni se reactiva a contactos dados de baja.

El correo conserva el logo original, tipografía, tarjeta blanca sobre fondo rosa,
colores morados y firma de Aleyda. Incluye descarga de la meditación, alternativa
de texto, dirección de la audiencia y enlace oficial de baja. El audio se aloja
fuera de Git y de los despliegues; es accesible para quien tenga el enlace.

## Configuración separada

Production usa `NEWSLETTER_GIFT_ENABLED`, `NEWSLETTER_GIFT_URL` y
`NEWSLETTER_WEBHOOK_SIGNING_SECRET`. Preview usa exclusivamente sus equivalentes
`PREVIEW_`, además de `PREVIEW_NEWSLETTER_CALLBACK_URL`, audiencia y credenciales
de Mailchimp propias y el destinatario único de pruebas. Ningún valor concreto
del audio ni credencial se guarda en este documento.

La nueva función queda cerrada hasta configurar explícitamente esos valores.
El callback es `/api/webhooks/newsletter`; acepta solo avisos firmados de
suscripción de la audiencia correcta, con fecha reciente y cuerpo original. El
webhook de Mailchimp debe tener firma habilitada, solo evento subscribe y fuente
de contacto (user), sin fuentes admin/API. La URL de Preview requiere su propio
acceso privado de automatización cuando Vercel la protege.

Antes de enviar se vuelve a consultar Mailchimp: contacto subscribed, identidad
coincidente, confirmación y etiqueta website. Los avisos ajenos, bajas y altas sin
confirmar no autorizan un envío. Las llamadas a Mailchimp son solo de lectura.

Un EmailLog con clave determinista conserva el mensaje; un bloqueo transaccional
evita carreras. Resend recibe siempre la misma clave de idempotencia y el mismo
contenido al reintentar. Un envío incierto de 23 horas o más queda para revisión
manual antes de cualquier repetición. No se necesita migración.

## Verificación y publicación

`tests/newsletter-gift.test.mjs` cubre firma, aislamiento, confirmación, bajas,
duplicados, reintentos, diseño y diagnóstico. La prueba real de concurrencia en
Neon Preview usa solo una fila ficticia retirada al terminar, con Mailchimp y
correo simulados. No equivale a una entrega completa del proveedor.

`/api/admin/newsletter/health` comprueba configuración, audiencia y webhook con
acceso ADMIN. Devuelve solo estados, sin credenciales, miembros o URLs privadas.

Falta completar la conexión firmada de la audiencia de pruebas, la confirmación
personal del contacto QA y la recepción real del correo con descarga. Solo tras
esa comprobación se debe pedir aprobación de la versión concreta para Production.
Las autorizaciones previas de pagos y descuentos no publican esta función.

Referencias: [webhooks de Mailchimp](https://mailchimp.com/developer/marketing/api-concepts/webhooks)
y [protección de automatización de Vercel](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
