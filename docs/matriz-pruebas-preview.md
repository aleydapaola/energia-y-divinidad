# Matriz de pruebas remotas de Preview

Seguimiento del plan de cierre del 25/10/2026. Las pruebas locales con dependencias simuladas no sustituyen estas comprobaciones remotas. Usar solo datos ficticios, PayPal sandbox, Bre-B simulado y el destinatario autorizado de Preview.

| Compra | Inicio y estado pendiente | Confirmación | Entrega única y acceso | Correo y calendario |
| --- | --- | --- | --- | --- |
| Producto digital · Bre-B | Nueva orden sintética, referencia exacta en registro privado | Completada desde ADMIN con referencia ficticia y declaración de simulación | Un entitlement PRODUCT; archivo TXT abierto desde CLIENT | Confirmación y aviso recibidos en Proton; no aplica calendario |
| Producto digital · PayPal | Flujo completo del navegador, 20 USD ficticios, comprador dedicado EYD | Captura COMPLETED; webhook procesado, sin error ni reintentos | Un entitlement; archivo TXT abierto desde CLIENT | Recepción de este correo pendiente; no aplica calendario |
| Sesión individual · Bre-B | Nueva orden sintética para 2/11/2026 a las 10:00 Colombia | Completada desde ADMIN, simulada | Una reserva CONFIRMED, duración 90 min y contador cero; vista CLIENT correcta con conversión Madrid y política | Correo recibido y política comprobada; Google sincronizado sin error, vista externa pendiente |
| Sesión individual · PayPal | Pendiente en el flujo actual; las compras históricas no validan esta versión | Captura y webhook sandbox | Una reserva, sin duplicado por callback/webhook/reintento | Correo y un evento de 90 min con etiqueta de pruebas |
| Curso · Bre-B | Nueva orden de curso sintético | Completada desde ADMIN, simulada | Un entitlement COURSE; lección protegida leída con CLIENT | Confirmación y aviso recibidos en Proton; no aplica calendario de sesiones |
| Curso · PayPal | Flujo completo desde carrito autenticado, 20 USD ficticios | Captura COMPLETED y webhook procesado sin error ni reintentos | Un entitlement COURSE; lección protegida leída con CLIENT | Recepción de este correo pendiente; no aplica calendario de sesiones |
| Evento/taller · Bre-B | Nueva orden de taller sintético futuro | Completada desde ADMIN, simulada | Una reserva CONFIRMED y un entitlement EVENT; vista CLIENT verificada, corrección horaria en preparación | Confirmación y aviso recibidos en Proton; no tratarlo como sesión individual |
| Evento/taller · PayPal | Pendiente | Captura y webhook sandbox | Inscripción y plazas correctas, sin duplicado | Correo; no tratarlo como sesión individual |

## Comprobaciones transversales

- El estado del pedido solo se consulta desde su cuenta propietaria o el navegador que lo creó. Verificado remotamente en bc904182 con el pedido PayPal ficticio: 200 con cookie firmada y 404 sin ella, sin detalles de compra en el rechazo. La cookie se utiliza exclusivamente en el dominio donde se creó el pedido.
- Los importes y monedas proceden del catálogo del servidor; una modificación del precio enviada por el navegador debe rechazarse antes de crear o confirmar un pago. Verificado remotamente en fbf14c07 desde preview.energiaydivinidad.com: importe alterado rechazado con 400 en PayPal y Bre-B. La confirmación ADMIN sin sesión devuelve 401. Estas pruebas no validan captura ni entrega.
- Una referencia reportada por el cliente no equivale a un ingreso. La confirmación de Bre-B en Preview es una simulación expresamente identificada, nunca una declaración sobre una transferencia real.
- Verificar el registro único de entrega y los reintentos. No marcar un correo como Delivered por la mera respuesta satisfactoria de un handler.
- En sesiones, comprobar disponibilidad y posibles solapamientos al elegir o cambiar horario, el instante en Colombia, la conversión local, la duración y el evento único. Las 2 reprogramaciones de la reserva ficticia anterior se conservan: no reiniciar el contador para facilitar la prueba.
- No ejecutar devoluciones reales. La política reconoce el derecho y el contacto para la tramitación manual; los tests de esta versión no incluyen automatización de reembolsos.

## Accesos: estado actual

ADMIN dedicado verificado y panel probado. Comprador PayPal Personal sandbox exclusivo de EYD creado con autorización e inicio de sesión completado por Xavier; primera compra de producto completada. Falta entrar a la cuenta web CLIENT aleydapaola@proton.me, sin +preview-admin: el ADMIN no valida los permisos de comprador. Se ha solicitado el enlace de recuperación desde Preview; el usuario debe definir y enviar personalmente la contraseña. Mailchimp separado sigue pendiente. Los párrafos siguientes conservan el diagnóstico anterior, ya superado en ADMIN y contenidos.

Actualización: Xavier ha iniciado sesión CLIENT. Verificados archivo TXT, lección Bre-B, reserva de taller y sesión con política y hora Colombia/Madrid. Segunda compra PayPal (curso) completada, con entrega única y lección disponible. Los párrafos históricos de accesos no representan bloqueos actuales. Mailchimp continúa pendiente.

### Diagnóstico inicial conservado

La confirmación remota de Bre-B necesita una sesión ADMIN de pruebas. PayPal necesita completar la aprobación con el comprador sandbox correspondiente. No elevar cuentas ni crear credenciales nuevas por iniciativa propia para superar estos pasos. Mailchimp requiere iniciar sesión en la cuenta separada y verificar su audiencia antes de activar la newsletter.

La inspección posterior de Neon Preview confirma que no existe ningún ADMIN, solo un USER. Crear una administración dedicada requiere autorización específica; no basta iniciar sesión. Además, todos los cursos del dataset están marcados como privados y no hay eventos futuros comprables: preparar ejemplos sintéticos separados antes de completar esas filas, sin abrir cursos privados ni redatar eventos reales. En f8672ed5 se verifica remotamente el rechazo de un curso privado y un evento pasado (400), la consulta anónima de reservas (401), la retirada de la creación antigua (410) y la indisponibilidad de newsletter sin configurar (503). Estas comprobaciones no sustituyen ninguna de las ocho entregas pendientes.


### Agenda compartida — 25/10/2026

Implementació de franges i comprovació de solapaments compartida al servidor. Prova real de Neon Preview: dues peticions a una franja, una sola reserva assignada; primera data no consumeix canvi; dos canvis simultanis preserven el màxim de dos. Només reserves efímeres pròpies, retirades al final; serveis externs no carregats. Proves automàtiques addicionals: buffers, durades guardades i llegades, canvi de dia Colòmbia, festius i bloquejos, antelació de demà, fora de graella, segons, autorització privada, reactivació ADMIN ocupada, idempotència per ordre i segon pagament amb franja perduda.

La prevalidació de checkout no reté la franja: entrega amb franja perduda pendent de revisió. Resta resoldre-ho abans de Production. Les proves de Neon no acrediten Google Calendar simultani, correu Delivered o les vuit compres completes.


### Bre-B remot des del panell ADMIN

Quatre comandes sintètiques completades a d41e1e81, només Preview: producte un entitlement PRODUCT; curs un COURSE; taller una reserva CONFIRMED i un EVENT; sessió una reserva CONFIRMED de 90 minuts el 2/11 a les 10:00 Colòmbia, comptador zero i Google sincronitzat sense error. Una auditoria per comanda. Confirmacions i avisos rebuts amb [PREVIEW] a l’única bústia autoritzada; rebut de sessió amb referència, data i política comprovades, i rebut de producte amb enllaç a Preview. Sense transferències reals.

Pendents: consulta del calendari extern per contrastar inici/final i absència de duplicats; accés a continguts amb sessió del client; captures PayPal amb el comprador Personal CO nou autoritzat per Xavier i creat al tauler d’Aleyda. No reutilitzar el comprador que Xavier identifica com a usat a ASA. La prova de curs PayPal usa un curs sintètic separat per verificar una compra nova. Les comandes PayPal preparades, sense captura, no acrediten entrega.

### PayPal producte completat — 37c7a828

Compra nova des del navegador, amb el pagador sandbox dedicat, retorn satisfactori a Preview i 20 USD ficticis. Una entrega PRODUCT, captura COMPLETED i webhook PAYMENT.CAPTURE.COMPLETED processat sense error (retryCount zero). Els tres tipus restants encara pendents; les comandes preparades des de CLI no es consideren captures. Accés positiu a fitxers i lliçons pendent de la sessió web CLIENT. Preview Ready verificada a dpl_929SuMgCMjdNH11yXBxXQVSvLC6H; Production preservada a 7b9a7ac3.
