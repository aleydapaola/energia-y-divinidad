# Política de sesiones individuales

Criterio confirmado por Xavier el 25 de octubre de 2026 para Aleyda.

| Situación | Derecho del cliente |
| --- | --- |
| 24 horas o más antes de la sesión | Reembolso íntegro o cambio de fecha |
| Menos de 24 horas | Sin reembolso automático; Aleyda valora personalmente las excepciones |
| Inasistencia | Sin reembolso |
| Aleyda cancela | Reembolso íntegro o cambio de fecha, a elección del cliente |

El cliente puede reprogramar desde Mis Sesiones un máximo de dos veces y con al menos 24 horas de antelación. Ambas condiciones son necesarias. Otros cambios se consultan con Aleyda. Se conserva la comparación del instante de la reserva: no se cuentan días civiles ni se depende del huso horario del navegador.

## Tramitación elegida

Xavier delega la decisión comercial. En esta fase se mantienen los cambios de fecha automáticos y los reembolsos monetarios tramitados manualmente por Aleyda, con contacto desde la ficha y los correos. Con 24 horas o más, revisar el pago no convierte el derecho al reembolso en una excepción discrecional.

Antes de devolver dinero, localizar la reserva y la operación original, comprobar el importe efectivamente pagado y las devoluciones previas. Tramitar la devolución por el medio original: PayPal desde la operación de PayPal; Bre-B mediante gestión manual del ingreso en Global66. Conservar la referencia de la devolución en el registro administrativo. No marcar el pago como reembolsado antes de confirmar la devolución. No descontar comisiones al cliente ni reemplazar por crédito su elección de devolución monetaria.

La cancelación actual de una reserva puede devolver créditos o sesiones de pack, pero no llama a la pasarela para devolver dinero. El formulario y el correo lo indican expresamente. El panel recuerda que, cuando cancela Aleyda, el cliente elige antes de cancelar. No se añade automatización financiera ni se ejecutan devoluciones reales en este cambio.

PayPal documenta el endpoint de devolución de una captura y la necesidad de un identificador de petición para evitar duplicados: [documentación oficial](https://developer.paypal.com/docs/api/payments/v2/#captures_refund). Cualquier automatización futura requerirá validar identidad del pago, estados y reintentos, sin duplicar devoluciones ni presentar una operación pendiente como completada.

## Alcance y verificación

Textos compartidos en la página de sesiones, Mis Sesiones, panel administrativo y correos de pago de sesiones, confirmación de reserva, reprogramación y cancelación. Las condiciones de cursos, eventos y otros productos se conservan.

Pruebas locales con servicios simulados comprueban la frontera exacta de 24 horas, el máximo de dos cambios en tarjeta y API, el rechazo de inasistencias y la política en correos. No acreditan entrega real de correo ni devolución bancaria. Los términos de Sanity y la publicación de Preview siguen pendientes; /terminos devolvía 404 y la última compilación remota revisada falló por conectividad a Neon Preview. No se ha publicado a Production.
