# Cierre priorizado de Preview — 27/10/2026

Instrucción de Xavier: establecer prioridades, ejecutar el plan restante y dejar un punto claro para retomar si hay que detener el trabajo. No se dispone de un indicador del saldo de créditos de IA. No publicar en Production sin aprobación de la versión concreta.

## Orden de ejecución

1. **Inventario durante el pago.** Retención transaccional de hora/plazas durante 20 minutos. Comprobar caducidad antes de capturar PayPal; conservar la retención ante captura incierta o aviso Bre-B hasta revisión. La entrega sustituye la retención por reserva/asignación en la misma transacción. Sin ingreso, el ADMIN puede rechazar el aviso y liberar con motivo y auditoría. El propietario puede cancelar una retención aún sin pagar, nunca una captura en curso ni un aviso recibido.
2. **Desplegar y verificar solo Preview.** Identidad de proyecto/equipo/repo/ref/SHA y ambos alias; migración aislada, sin afectar Production.
3. **Bre-B ADMIN.** Verificar importe incorrecto rechazado y confirmación ficticia correcta con 80.000 COP en la orden de QR pendiente. Comprobar entrega única y auditoría.
4. **PayPal sesión y taller.** Completar desde navegador, comprobar captura/webhook, entrega única, correos y cita de 90 minutos. El clic final corresponde a Xavier: la revisión automática rechazó que lo ejecute el agente, incluso en sandbox. No capturar esas órdenes por API como alternativa al clic.
5. **Revisión móvil y recorrido completo.** Pago/retención/caducidad, cuenta, navegación y textos de pruebas. No confundir pruebas automáticas con revisión visual.
6. **Legal y propuesta de publicación.** Revisar borradores y condiciones particulares; datos fiscales/dirección pendientes. Preparar propuesta concreta con riesgos y pruebas, manteniendo Production sin cambios.

## Estado de la retención

Implementada y desplegada en Preview: 00642dfec0407bd966d8815451b4e0ded5fbca28, Ready en dpl_HP94YK2u1UESjTzLwdkdtMC2H9Sg. Ambos alias asignados; subdominio, proyecto y fuente comprobados por API. Production conserva 7b9a7ac3/dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc. Modelo CheckoutHold y migración 20261027220000_checkout_inventory_holds aplicada exclusivamente al endpoint directo de Neon Preview después de los dos controles locales de aislamiento. No hay backfill de pedidos o reservas históricas. No se modifica la política de cancelaciones ni se automatizan devoluciones.

La disponibilidad pública, reprogramaciones y asignaciones de evento cuentan retenciones activas bajo los bloqueos compartidos anteriores. Solo HELD sin pago caduca. CAPTURING y REPORTED no caducan automáticamente: un timeout no demuestra ausencia de ingreso. Si una transferencia se comunica tarde y ya no hay disponibilidad, el aviso se conserva para revisión sin crear otra reserva. Una captura PayPal caducada se rechaza antes de tocar el proveedor. Reintentos con la misma clave de idempotencia de PayPal.

El cliente puede liberar una reserva temporal solo si declara que no ha pagado, no existe aviso de transferencia y no ha empezado la captura. Se corrige también la ruta de regreso /pago/cancelado, que no existía. Los pedidos históricos de hora/plazas sin retención no muestran instrucciones Bre-B hasta revisión; sí permiten comunicar una transferencia ya realizada. No se consideran pagos por mostrar un QR o comunicar una referencia.

Prueba real con fixtures efímeras en Neon Preview: una orden y un rechazo al competir por la última plaza; una orden y un rechazo por la misma hora; caducidad libera solo HELD; CAPTURING mantiene inventario tras superar el vencimiento; rollback conserva retención; entrega reemplaza la retención sin contar dos plazas; REPORTED mantiene hora para revisión. Fixtures de esta ejecución retiradas; históricos intactos. No se cargan clientes de pago, correo ni Calendar. Script tests/checkout-inventory.integration.mjs.

139 pruebas automáticas correctas, comprobación de tipos correcta y lint de archivos cambiados sin errores tras aplicar las correcciones de estilo. Incluye la ruta real de captura sin cobro ante caducidad o falta de acceso, claves de idempotencia del SDK, baja de instrucciones/QR al caducar, formulario de aviso tardío disponible y liberación autorizada con auditoría. No considerar validado el despliegue por estos resultados locales.

Prueba remota adicional desde el navegador autenticado ADMIN, solo inventario: sesión del 3/11/2026 a las 15:00 Colombia disponible antes, bloqueada al crear el pedido Bre-B simulado y disponible otra vez al cancelarlo declarando que no se ha pagado. Pedido BREB-732c4a96-54dc-45b7-a3e4-00d601d8c737 CANCELLED, cero reservas, accesos o importes recibidos. Plazo de 20 minutos visible y datos bancarios ficticios. No se ha enviado aviso de transferencia ni confirmado un ingreso. Mantener el registro cancelado como evidencia; no modificar históricos.

## Bre-B e email cerrados

Orden de QR BREB-48a2aa96-88d8-4ec1-a723-2c58bb8151d1: discrepancia bloqueada en el formulario sin motivo; al introducir 80.000 COP exactos se habilita la confirmación. Confirmada desde ADMIN como simulación con referencia ficticia distinta de la referencia comunicada. Estado COMPLETED, receivedAmount=80000, un entitlement PRODUCT y auditoría MANUAL_PAYMENT_CONFIRMATION visible. Recibo nuevo recibido en Proton con referencia exacta, importe y enlace a Mis Compras de Preview. No se ha transferido dinero real.

También abierto el recibo PayPal anterior del producto: referencia PP-d8e8cb1a-a049-4833-a4de-71f35c0f8666, 20 USD y enlace a Mis Compras de Preview. Queda cerrada esa evidencia de email, además del curso comprobado anteriormente.

## Revisión móvil en curso

Vista de Brave DevTools con preset iPhone SE 375×667. Portada, menú desplegable, membresía y estado de pedido cancelado legibles, sin desbordamiento horizontal visible. El checkout del taller muestra resumen, fecha Colombia y 19 cupos, pero duplica la cabecera y el WhatsApp flotante tapa contenido. Corrección local EventosShell: el checkout mantiene su propia cabecera y no incorpora cabecera/pie públicos; las demás páginas de eventos conservan navegación/pie. Ajustes locales de etiquetas: menú accesible en español, pago cancelado claro, simulación ya verificada y motivo de auditoría ficticio. Estos ajustes todavía no están desplegados ni revisados remotamente.

140 pruebas automáticas y tipos correctos con estos ajustes locales, incluida comprobación del checkout sin cabecera/pie públicos y conservación de la navegación del resto de eventos. La pantalla de regreso de PayPal solo ofrece liberar si hay una retención HELD sin pago ni aviso; no muestra ese control durante captura/revisión. Pendiente commit/despliegue de esta revisión.

## Sesión PayPal completada por Xavier

Xavier introduce personalmente la contraseña sandbox cuando PayPal la vuelve a solicitar y confirma la compra. Navegador muestra Pago Exitoso con referencia PP-aece0b11-cfd7-42cd-9a39-a5fec6dc2a60. Neon Preview: COMPLETED, comprador dedicado correcto, captura COMPLETED; un booking CONFIRMED de 90 min el 2/11/2026 a las 14:00 Colombia (19:00Z), contador cero, CheckoutHold CONSUMED. Evento Google 8rqki1lg2pnv6u0f6m1o7qeonk sincronizado sin error. Webhook PAYMENT.CAPTURE.COMPLETED procesado, failed=false, retryCount=0. Recarga de confirmación mantiene éxito; no repetir el pago. Correo, vista CLIENT y vista externa Google se están verificando. Resta taller PayPal.

## Datos legales: respuesta del usuario

Xavier aporta dos variantes posibles del NIT y explica que Aleyda no recuerda el dígito. No se selecciona ni publica ninguna: sigue pendiente cotejar con el RUT. La cédula conserva su etiqueta de cédula. Dirección pública autorizada y condiciones particulares siguen pendientes. No reutilizar automáticamente la dirección introducida en Mailchimp ni datos de otro proyecto.

## Ya cerrado

Newsletter de pruebas conectada y comprobada contra Mailchimp separado: pending, doble confirmación personal de Xavier, subscribed, baja desde preferencias del suscriptor y 409/formulario oficial al solicitar alta de nuevo. Contacto de QA dejado de baja, sin campañas. Ver docs/newsletter-preview.md.

## Puntos para retomar

- Revisar git status y este documento antes de editar. Rama preview; los dos commits previos de documentación de Mailchimp están conservados.
- Aplicación actualmente servida: 00642dfe/dpl_HP94YK2u1UESjTzLwdkdtMC2H9Sg en https://preview.energiaydivinidad.com. Configuración Mailchimp y retenciones activas. Ajustes móviles/de etiquetas locales pendientes de commit/despliegue.
- Referencias exactas de QA en .local-private/preview-qa-2026-10-27 y scripts de lectura en /private/tmp. No copiar secretos a este documento ni al chat.
- Bre-B QR/importe completado: BREB-48a2aa96-88d8-4ec1-a723-2c58bb8151d1, importe ficticio 80.000 COP, una entrega.
- PayPal sesión completada: PP-aece0b11-cfd7-42cd-9a39-a5fec6dc2a60, 100 USD ficticios, 2/11/2026 14:00 Colombia, 90 minutos. No crear ni cobrar otra para repetir esta evidencia. Taller PayPal aún sin completar.
- Sesión web CLIENT en recuperación mediante la credencial existente guardada en Brave, sin leer/cambiar contraseña, para revisar Mis Sesiones y comprar el taller. Xavier ya ha terminado su intervención en PayPal.
- Antes de commit, incluir explícitamente la nueva migración: prisma/migrations está ignorado históricamente; no añadir las demás migraciones locales ignoradas.
