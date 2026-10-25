# Matriz de pruebas remotas de Preview

Seguimiento del plan de cierre del 25/10/2026. Las pruebas locales con dependencias simuladas no sustituyen estas comprobaciones remotas. Usar solo datos ficticios, PayPal sandbox, Bre-B simulado y el destinatario autorizado de Preview.

| Compra | Inicio y estado pendiente | Confirmación | Entrega única y acceso | Correo y calendario |
| --- | --- | --- | --- | --- |
| Producto digital · Bre-B | Verificado: BREB-17e5b111-ec4e-4464-989b-be0146a6c159; reportar referencia no activa acceso | Pendiente: panel ADMIN en Preview y referencia ficticia | Pendiente | Pendiente de verificar entrega del correo; no aplica calendario |
| Producto digital · PayPal | Verificado: PP-1e5c1aa2-98f6-4f80-b59b-24f5d1dd33fe, 20 USD, aprobación en sandbox y PENDING | Pendiente: comprador sandbox, captura y webhook | Pendiente | Pendiente de verificar entrega del correo; no aplica calendario |
| Sesión individual · Bre-B | Pendiente en la versión actual | Pendiente, siempre simulada | Pendiente: una reserva; elegir primera fecha conserva dos cambios | Correo y un evento de 90 min con etiqueta de pruebas |
| Sesión individual · PayPal | Pendiente en el flujo actual; las compras históricas no validan esta versión | Captura y webhook sandbox | Una reserva, sin duplicado por callback/webhook/reintento | Correo y un evento de 90 min con etiqueta de pruebas |
| Curso · Bre-B | Pendiente | Pendiente, siempre simulada | Acceso al curso existente, sin duplicado | Correo; no aplica calendario de sesiones |
| Curso · PayPal | Pendiente | Captura y webhook sandbox | Acceso al curso existente, sin duplicado | Correo; no aplica calendario de sesiones |
| Evento/taller · Bre-B | Pendiente | Pendiente, siempre simulada | Inscripción y plazas correctas, sin duplicado | Correo; no tratarlo como sesión individual |
| Evento/taller · PayPal | Pendiente | Captura y webhook sandbox | Inscripción y plazas correctas, sin duplicado | Correo; no tratarlo como sesión individual |

## Comprobaciones transversales

- El estado del pedido solo se consulta desde su cuenta propietaria o el navegador que lo creó. Verificado remotamente en bc904182 con el pedido PayPal ficticio: 200 con cookie firmada y 404 sin ella, sin detalles de compra en el rechazo. La cookie se utiliza exclusivamente en el dominio donde se creó el pedido.
- Los importes y monedas proceden del catálogo del servidor; una modificación del precio enviada por el navegador debe rechazarse antes de crear o confirmar un pago. Verificado remotamente en fbf14c07 desde preview.energiaydivinidad.com: importe alterado rechazado con 400 en PayPal y Bre-B. La confirmación ADMIN sin sesión devuelve 401. Estas pruebas no validan captura ni entrega.
- Una referencia reportada por el cliente no equivale a un ingreso. La confirmación de Bre-B en Preview es una simulación expresamente identificada, nunca una declaración sobre una transferencia real.
- Verificar el registro único de entrega y los reintentos. No marcar un correo como Delivered por la mera respuesta satisfactoria de un handler.
- En sesiones, comprobar disponibilidad y posibles solapamientos al elegir o cambiar horario, el instante en Colombia, la conversión local, la duración y el evento único. Las 2 reprogramaciones de la reserva ficticia anterior se conservan: no reiniciar el contador para facilitar la prueba.
- No ejecutar devoluciones reales. La política reconoce el derecho y el contacto para la tramitación manual; los tests de esta versión no incluyen automatización de reembolsos.

## Accesos pendientes

La confirmación remota de Bre-B necesita una sesión ADMIN de pruebas. PayPal necesita completar la aprobación con el comprador sandbox correspondiente. No elevar cuentas ni crear credenciales nuevas por iniciativa propia para superar estos pasos. Mailchimp requiere iniciar sesión en la cuenta separada y verificar su audiencia antes de activar la newsletter.

La inspección posterior de Neon Preview confirma que no existe ningún ADMIN, solo un USER. Crear una administración dedicada requiere autorización específica; no basta iniciar sesión. Además, todos los cursos del dataset están marcados como privados y no hay eventos futuros comprables: preparar ejemplos sintéticos separados antes de completar esas filas, sin abrir cursos privados ni redatar eventos reales. En f8672ed5 se verifica remotamente el rechazo de un curso privado y un evento pasado (400), la consulta anónima de reservas (401), la retirada de la creación antigua (410) y la indisponibilidad de newsletter sin configurar (503). Estas comprobaciones no sustituyen ninguna de las ocho entregas pendientes.


### Agenda compartida — 25/10/2026

Implementació de franges i comprovació de solapaments compartida al servidor. Prova real de Neon Preview: dues peticions a una franja, una sola reserva assignada; primera data no consumeix canvi; dos canvis simultanis preserven el màxim de dos. Només reserves efímeres pròpies, retirades al final; serveis externs no carregats. Proves automàtiques addicionals: buffers, durades guardades i llegades, canvi de dia Colòmbia, festius i bloquejos, antelació de demà, fora de graella, segons, autorització privada, reactivació ADMIN ocupada, idempotència per ordre i segon pagament amb franja perduda.

La prevalidació de checkout no reté la franja: entrega amb franja perduda pendent de revisió. Resta resoldre-ho abans de Production. Les proves de Neon no acrediten Google Calendar simultani, correu Delivered o les vuit compres completes.


### Bre-B remot des del panell ADMIN

Quatre comandes sintètiques completades a d41e1e81, només Preview: producte un entitlement PRODUCT; curs un COURSE; taller una reserva CONFIRMED i un EVENT; sessió una reserva CONFIRMED de 90 minuts el 2/11 a les 10:00 Colòmbia, comptador zero i Google sincronitzat sense error. Una auditoria per comanda. Confirmacions i avisos rebuts amb [PREVIEW] a l’única bústia autoritzada; rebut de sessió amb referència, data i política comprovades, i rebut de producte amb enllaç a Preview. Sense transferències reals.

Pendents: consulta del calendari extern per contrastar inici/final i absència de duplicats; accés a continguts amb sessió del client; captures PayPal amb el comprador Personal CO nou autoritzat per Xavier i creat al tauler d’Aleyda. No reutilitzar el comprador que Xavier identifica com a usat a ASA. La prova de curs PayPal usa un curs sintètic separat per verificar una compra nova. Les comandes PayPal preparades, sense captura, no acrediten entrega.
