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
