# Newsletter de pruebas

Conectar únicamente la cuenta separada de Mailchimp destinada a Preview. La audiencia de producción no se utiliza para pruebas. Único destinatario autorizado: aleydapaola@proton.me.

## Alta pendiente del usuario

El 27/10/2026 Xavier facilita la sesión de alta de Mailchimp en us2. El formulario ha avanzado al paso de dirección postal. El usuario completa directamente la dirección que Aleyda autorice para el pie de los correos, cualquier aceptación de condiciones y el plan Free. No copiar la dirección a estos documentos, inventarla ni obtenerla de otro proyecto. No se han creado claves ni conectado la cuenta todavía.

## Configuración preparada

1. Verificar en el panel el correo de cuenta, nombre de pruebas, plan Free y audiencia vacía. Contrastar que la audiencia pertenece a esta cuenta y es distinta de la real. La región us2 por sí sola no acredita la identidad de la cuenta.
2. Preparar una clave identificada como EYD Preview, con creación y almacenamiento exclusivo en Preview autorizados expresamente en ese paso. No copiar su valor al chat, repositorio o informes.
3. Conservar MAILCHIMP_API_KEY original en Production/Development y MAILCHIMP_LIST_ID original. Añadir la clave nueva solo a Preview, PREVIEW_MAILCHIMP_LIST_ID con la audiencia propia y la excepción de MAILCHIMP_SERVER_PREFIX para la rama preview si es necesaria. No activar envíos hasta verificar el aislamiento.
4. Desplegar Preview y probar desde el formulario: una solicitud pending al único destinatario autorizado, confirmación desde su correo, miembro subscribed y baja. Verificar recepción real, no solo respuesta del handler. No enviar campañas a contactos reales.
5. Una persona que se dio de baja se inscribe de nuevo en el formulario alojado de Mailchimp. El código no cambia esa baja por API ni afirma que ya está suscrita. Enlaces devueltos al usuario restringidos a HTTPS en dominios list-manage.com.

## Corrección de preparación del 27/10

La API existente usaba una cabecera de autenticación no documentada y respondía «Ya estás en nuestra lista» ante cualquier Member Exists, incluso una baja o una solicitud pendiente. Se prepara autenticación Basic, validación de email y distinción del estado actual. Para contactos de baja se ofrece el formulario alojado de confirmación, sin reactivarlos. El componente deja de prometer un nuevo correo a personas ya suscritas.

Referencias oficiales: [autenticación](https://mailchimp.com/developer/marketing/api-concepts/authentication), [consulta de miembro](https://mailchimp.com/developer/marketing/api/lists/members/get-member), [nueva inscripción tras una baja](https://mailchimp.com/help/resubscribe-a-contact/).
