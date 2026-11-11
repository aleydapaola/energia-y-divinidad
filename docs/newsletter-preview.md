# Newsletter de pruebas

Conectar únicamente la cuenta separada de Mailchimp destinada a Preview. La audiencia de producción no se utiliza para pruebas. Único destinatario autorizado: aleydapaola@proton.me.

## Cuenta verificada y conexión — 27/10/2026

Xavier ha completado el alta, la dirección postal y el plan Free. Cuenta verificada en el panel: `preview-newsletter@energiaydivinidad.com`, usuario `previewnewsletter`, web de Preview. No copiar la dirección postal a estos documentos ni reutilizarla en las políticas sin confirmación.

Audiencia `2263470886` (us2), distinta de la real `d1b9e1cbf7`, renombrada y verificada como **PRUEBAS — NO REAL — Energía y Divinidad**. Double opt-in activado y guardado. El indicador de plan mostraba un contacto antes de las pruebas, pero la pantalla inicial de contactos no permitía identificarlo: no considerar la audiencia vacía ni enviar una campaña al conjunto. Sin webhooks ni sitios conectados.

Xavier autoriza generar la clave **EYD Preview - Newsletter - PRUEBAS**, aceptar la política API y almacenarla solo en Preview. La revisión automática rechaza el clic del agente en Generate Key; Xavier lo realiza personalmente y confirma su creación. Clave con vencimiento indicado por Mailchimp el 27/10/2027, copiada mediante el botón del proveedor y pegada directamente en Vercel; su valor no se registra en el chat, repositorio, informes ni archivos locales. Pantalla de clave cerrada y portapapeles sustituido por una URL no secreta.

Metadatos Vercel verificados: clave nueva de tipo Secret/sensitive, target `preview`, excepción de rama `preview`; clave original conservada en Production/Development. `PREVIEW_MAILCHIMP_LIST_ID=2263470886` y `MAILCHIMP_SERVER_PREFIX=us2` exclusivos de esa rama, sin sustituir los valores originales. Redespliegue de `a7afb01e` Ready en `dpl_CyT2PgQqjBFvRKQ9Gkzh6dJx9qEG`, alias personalizado y técnico asignados. Proyecto, repositorio y rama contrastados por API. Production conserva `7b9a7ac3` en su despliegue anterior.

Prueba real desde el formulario de portada de Preview con aleydapaola@proton.me: solicitud creada y correo **PRUEBAS — NO REAL — Energía y Divinidad: Please Confirm Subscription** recibido en Proton, remitente preview-newsletter@energiaydivinidad.com y destinatario autorizado comprobados. Repetir la solicitud devuelve 200 y «Tu suscripción sigue pendiente», sin afirmar que está activa ni enviar una confirmación nueva. Se abre el enlace del mensaje; Mailchimp exige Confirm Humanity (reCAPTCHA). Solicitado a Xavier que complete personalmente la comprobación y Subscribe. Confirmación final, estado subscribed y baja pendientes de esa intervención; no resolver ni eludir el CAPTCHA.

Xavier confirma que ha pulsado Subscribe tras la comprobación humana. Página alojada «Your subscription to our list has been confirmed» verificada. Repetir la solicitud de Preview devuelve 200 y «Ya estás en nuestra lista», confirmando subscribed sin duplicar el contacto ni reenviar la confirmación. Desde Manage subscription preferences se solicita y recibe en Proton el correo Update Profile, y se abre su enlace para probar la baja como suscriptor.

Baja completada desde ese formulario, con el correo autorizado: Mailchimp muestra **Unsubscribe Successful**. Nueva solicitud por API devuelve **409** con el formulario oficial de reinscripción, sin reactivar la dirección. Repetida desde la portada real: mensaje de confirmación y enlace **Volver a suscribirme** visibles. Se deja el contacto de QA de baja. No se han enviado campañas ni modificado contactos de la audiencia real.

## Configuración preparada

1. Verificar en el panel el correo de cuenta, nombre de pruebas, plan Free y contactos existentes. Contrastar que la audiencia pertenece a esta cuenta y es distinta de la real. La región us2 por sí sola no acredita la identidad de la cuenta.
2. Preparar una clave identificada como EYD Preview, con creación y almacenamiento exclusivo en Preview autorizados expresamente en ese paso. No copiar su valor al chat, repositorio o informes.
3. Conservar MAILCHIMP_API_KEY original en Production/Development y MAILCHIMP_LIST_ID original. Añadir la clave nueva solo a Preview, PREVIEW_MAILCHIMP_LIST_ID con la audiencia propia y la excepción de MAILCHIMP_SERVER_PREFIX para la rama preview si es necesaria. No activar envíos hasta verificar el aislamiento.
4. Desplegar Preview y probar desde el formulario: una solicitud pending al único destinatario autorizado, confirmación desde su correo, miembro subscribed y baja. Verificar recepción real, no solo respuesta del handler. No enviar campañas a contactos reales.
5. Una persona que se dio de baja se inscribe de nuevo en el formulario alojado de Mailchimp. El código no cambia esa baja por API ni afirma que ya está suscrita. Enlaces devueltos al usuario restringidos a HTTPS en dominios list-manage.com.

## Corrección de preparación del 27/10

La API existente usaba una cabecera de autenticación no documentada y respondía «Ya estás en nuestra lista» ante cualquier Member Exists, incluso una baja o una solicitud pendiente. Se prepara autenticación Basic, validación de email y distinción del estado actual. Para contactos de baja se ofrece el formulario alojado de confirmación, sin reactivarlos. El componente deja de prometer un nuevo correo a personas ya suscritas.

Referencias oficiales: [autenticación](https://mailchimp.com/developer/marketing/api-concepts/authentication), [consulta de miembro](https://mailchimp.com/developer/marketing/api/lists/members/get-member), [nueva inscripción tras una baja](https://mailchimp.com/help/resubscribe-a-contact/).


## Bienvenida con meditación — revisión del 28/10

El contenido Final welcome email conserva el enlace provisional # solicitado por Xavier. La intención confirmada es entregarlo por email después de confirmar la suscripción, no considerar la confirmación técnica como entrega del regalo. Revisión actual de la cuenta de pruebas: el constructor permite editar el contenido, pero no muestra Send a final welcome email en el selector, parte superior ni pie. Tampoco se encontró en los ajustes modernos de audiencia/formularios. No se ha activado automatización, enviado un test/campaña ni cambiado la baja del contacto QA. La entrega automática sigue sin validar; no afirmar que el mensaje se envía por existir el borrador. No activar planes de pago ni añadir otro proveedor sin preparar y revisar el circuito.

## Audio recibido — 02/11/2026

Xavier facilita `Meditacion_Angel_Guarda_.m4a` como regalo para los suscriptores de EYD. Se prepara para la newsletter de bienvenida ya acordada; no es una activación de membresía ni un cambio de pagos.

- Original de unos 27 MB preservado, con copia privada y SHA-256 coincidente. Duración: 18 min 43 s; AAC estéreo, 48 kHz. No se recorta ni se sustituye el original.
- Copia web M4A/AAC de 9.263.703 bytes, estéreo a 48 kHz, preparada con metadatos de título y arranque progresivo. Duración 1122,837 s frente a 1122,832 s del original; decodificación completa sin errores. La reducción usa compresión con pérdida; conservar el original como fuente.
- Mailchimp admite M4A y archivos de hasta 10 MB: [documentación de archivos](https://mailchimp.com/help/share-files-with-contacts/). Entrega prevista mediante enlace, no adjunto. No añadir el audio al repositorio ni al despliegue Next.
- Audio, manifiestos y vista previa local del correo en `.local-private/newsletter-meditation-2026-11-02/`, ignorado por Git. La plantilla pública usa un parámetro para la URL; el audio y el enlace concreto se conservan fuera del repositorio.
- Xavier inicia sesión con `previewnewsletter`. Cuenta us2, propietaria preview, audiencia `PRUEBAS — NO REAL — Energía y Divinidad`, ID `2263470886` / interno `1789973`, y remitente `preview-newsletter@energiaydivinidad.com` cotejados antes de subir el archivo. No se ha usado la audiencia real.
- Copia web subida una sola vez a Content Studio de la cuenta de pruebas. Descarga HTTP 200 de 9.263.703 bytes y SHA-256 idéntico a la copia preparada; Range HTTP 206. URL y prueba en `uploaded-audio-proof.json` privado. El alojamiento de Mailchimp permite acceso a quien tenga el enlace, sin prometer control de acceso ni DRM.
- Bloque Final welcome email guardado con título, enlace real de descarga, duración/tamaño y aviso de Preview. Asunto guardado como `[PREVIEW] Tu meditación del Ángel de la Guarda`. No se han enviado correos ni cambiado estados de contactos. El interruptor de activación sigue sin estar disponible; su estado no está verificado. La pantalla de Automation Flows de esta cuenta Free indica que exige ampliar el plan para lanzar flujos; no se ha activado un plan de pago ni un flujo.
- Xavier exige conservar el formato de los correos actuales e incluir exactamente su logo. Plantilla local actualizada tomando como referencia `sendWelcomeEmail` en `lib/email.ts`: logo de 200 px, fondo rosa, tarjeta blanca, estructura de tablas de 600 px, tipografía y botón violeta. Archivo del logo publicado cotejado por SHA-256 con el existente en el repositorio. Plantillas transaccionales actuales intactas. Esta variante con logo está preparada localmente; aún no se ha guardado sobre el bloque de Mailchimp.
- Pendiente decidir el circuito de entrega automática. Se consulta reutilizar el servicio de correo existente de EYD para conservar el diseño y evitar contratar otro servicio, manteniendo Mailchimp para confirmar suscripciones. No implementar cambios en la cuenta real por la aprobación anterior de pagos: el nuevo circuito requiere Preview y una aprobación concreta posterior. Conservar la baja del contacto QA hasta su reinscripción personal. Evidencia y estado en `newsletter-progress.json` privado.

## Entrega mediante Resend preparada — 02/11/2026

Xavier elige expresamente el correo actual de EYD, sin otro proveedor ni ampliación
de Mailchimp. Se implementa `34ee8cf8` desde Preview verificada `52e9c8ea`, en una
rama y directorio aislados para preservar los documentos pendientes. Publicado
únicamente a origin/preview; no modifica main ni Production.

- Nuevo callback firmado de Mailchimp y entrega con Resend tras consultar el alta
  confirmada, identidad, audiencia y etiqueta website. No modifica contactos ni
  bajas. Configuración PREVIEW_ propia; función cerrada sin activación explícita.
- Mismo logo y diseño de los correos actuales, comprobados visualmente con el
  renderizador real. Revisión local en `correo-resend-para-revision.html` privado.
- Registro duradero, bloqueo por mensaje e idempotencia del proveedor. Un envío
  incierto fuera de la ventana segura queda para revisión manual.
- 19 pruebas de newsletter correctas, tipos correctos y lint sin errores (cinco
  advertencias). Prueba real de carrera en Neon Preview: dos avisos, un registro y
  una llamada al correo simulado; retirada solo la fila ficticia propia.
- URL del audio y flag false guardados solo en Vercel Preview/rama preview. No
  hay clave de firma nueva ni conexión creada todavía. Build Preview en curso.
- Solicitada confirmación de la conexión y credenciales persistentes de prueba
  conforme a las reglas del navegador. Falta conexión firmada, reinscripción
  personal QA, entrega real y revisión de recepción antes de pedir Production.

Detalles de operación en [newsletter-gift-delivery.md](newsletter-gift-delivery.md).

- Confirmación posterior recibida: Xavier autoriza conectar y probar únicamente
  Preview. Webhook creado sin ampliar el plan Free, firma HMAC activa, solo
  subscribe y fuente contacto; sin fuentes admin/API. Acceso dedicado de Vercel
  guardado en privado. Firma como Secret Sensitive solo Preview/rama preview,
  sin comentario ni copia en Git/informes.
- Primer despliegue `dpl_EwR87BWL2qAGKHuUV4D39EbXBwE6` Ready con el SHA indicado,
  callback fijo HTTP 200 y audiencia de pruebas verificada por diagnóstico ADMIN.
  Reconstrucción del mismo SHA con configuración habilitada en curso:
  `dpl_HJ5wPrXbnJ1qKTxGmarqYzxgrQaQ`. No considerar la entrega real comprobada
  por haber creado el webhook.
- Contacto QA cotejado en Mailchimp: etiqueta website y estado Unsubscribed.
  La ruta existente devuelve 409 con el formulario oficial de reinscripción;
  no reactiva el contacto ni envía correo. Formulario de baja del pie HTTP 200.

- Reconstrucción configurada Ready, mismo SHA, ambos alias de Preview verificados.
  Diagnóstico ADMIN `ready=true` con todas las comprobaciones correctas. Callback
  sin firma y diagnóstico anónimo HTTP 401. Production conserva `52e9c8ea`.
  Queda el alta personal QA desde el formulario oficial y verificar recepción,
  logo y descarga; no se han enviado todavía regalos reales de esta función.

## Correo recibido y corrección de audio — 02/11/2026

Alta confirmada personalmente por Xavier. Aviso firmado HTTP 200, un registro
SENT y un correo recibido en Proton con remitente EYD, logo y diseño habituales.
El enlace de Mailchimp abre blanco en Brave: Xavier no puede descargar ni oír.
HTTP 200/hash correcto no valida este recorrido; las cabeceras del proveedor son
application/octet-stream sin disposición de descarga.

Corrección `649e5c2a`, únicamente Preview, añade página con reproductor nativo y
descarga propia con MIME/rangos correctos. Los correos nuevos enlazan a esa página
manteniendo diseño y logo. El mensaje anterior conserva el enlace antiguo; no
se reescribe ni se repite automáticamente el regalo. 23 pruebas, tipos y lint sin
errores; fragmento real del handler HTTP 206/audio/mp4 correcto. Despliegue
`dpl_7krFkz46G55e4z9DJreznFmX54bH` en curso. Pendiente verificación del navegador;
no publicar Production hasta aprobar la versión concreta.

Resultado posterior: despliegue Ready y alias cotejados. Página HTTP 200, MIME
audio/mp4, avance con rango 206 y descarga attachment de 9.263.703 bytes/hash
coincidente. Brave carga duración, reproduce con tiempo avanzando, salta a 9:45
y pausa; descarga muestra `meditacion-angel-de-la-guarda.m4a`, `8.8 MB • Done`.
La herramienta no mide el sonido del dispositivo; el usuario puede comprobarlo
en la página de Preview. Enviada una sola corrección de prueba desde el panel
existente con el enlace nuevo, sin campaña/cola ni reinscribir QA. El correo
original ya enviado no cambia. Production conserva su versión aprobada anterior.

Corrección recibida en Proton y enlace comprobado desde ese correo: abre la página
de regalo con sus controles. Pestaña preparada al inicio y pausada. No repetir la
corrección ni el alta QA. La publicación de newsletter sigue pendiente de aprobación
de esta versión y configuración propia de la audiencia real.

Xavier confirma «esto funciona bien» con captura del reproductor de Preview en
0:04. Se registra como validación de uso de la reproducción por el usuario;
no equivale a autorización explícita para publicar en Production. No repetir
suscripción, entrega ni comprobaciones ya cerradas.

## Publicación real completada — 03/11/2026

Xavier autoriza después expresamente publicar el sistema. Misma versión validada
`649e5c2a` desplegada y activada en Production, con cuenta/audiencia/audio/webhook
reales separados de Preview. Despliegue `dpl_GGDMGfFcFdUhQtiodDGFSZk2J7yu` Ready,
ambos dominios cotejados y diagnóstico ADMIN ready. Página, audio por rangos y
descarga íntegra públicos correctos, sin repetir altas ni enviar campaña a
contactos existentes. Detalles en
[publicacion-regalo-newsletter-2026-11-03.md](publicacion-regalo-newsletter-2026-11-03.md).
