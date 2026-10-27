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

Preparada localmente en preview, aún sin desplegar. Modelo CheckoutHold y migración 20261027220000_checkout_inventory_holds aplicada exclusivamente al endpoint directo de Neon Preview después de los dos controles locales de aislamiento. No hay backfill de pedidos o reservas históricas. No se modifica la política de cancelaciones ni se automatizan devoluciones.

La disponibilidad pública, reprogramaciones y asignaciones de evento cuentan retenciones activas bajo los bloqueos compartidos anteriores. Solo HELD sin pago caduca. CAPTURING y REPORTED no caducan automáticamente: un timeout no demuestra ausencia de ingreso. Si una transferencia se comunica tarde y ya no hay disponibilidad, el aviso se conserva para revisión sin crear otra reserva. Una captura PayPal caducada se rechaza antes de tocar el proveedor. Reintentos con la misma clave de idempotencia de PayPal.

El cliente puede liberar una reserva temporal solo si declara que no ha pagado, no existe aviso de transferencia y no ha empezado la captura. Se corrige también la ruta de regreso /pago/cancelado, que no existía. Los pedidos históricos de hora/plazas sin retención no muestran instrucciones Bre-B hasta revisión; sí permiten comunicar una transferencia ya realizada. No se consideran pagos por mostrar un QR o comunicar una referencia.

Prueba real con fixtures efímeras en Neon Preview: una orden y un rechazo al competir por la última plaza; una orden y un rechazo por la misma hora; caducidad libera solo HELD; CAPTURING mantiene inventario tras superar el vencimiento; rollback conserva retención; entrega reemplaza la retención sin contar dos plazas; REPORTED mantiene hora para revisión. Fixtures de esta ejecución retiradas; históricos intactos. No se cargan clientes de pago, correo ni Calendar. Script tests/checkout-inventory.integration.mjs.

139 pruebas automáticas correctas, comprobación de tipos correcta y lint de archivos cambiados sin errores tras aplicar las correcciones de estilo. Incluye la ruta real de captura sin cobro ante caducidad o falta de acceso, claves de idempotencia del SDK, baja de instrucciones/QR al caducar, formulario de aviso tardío disponible y liberación autorizada con auditoría. No considerar validado el despliegue por estos resultados locales.

## Datos legales: respuesta del usuario

Xavier aporta dos variantes posibles del NIT y explica que Aleyda no recuerda el dígito. No se selecciona ni publica ninguna: sigue pendiente cotejar con el RUT. La cédula conserva su etiqueta de cédula. Dirección pública autorizada y condiciones particulares siguen pendientes. No reutilizar automáticamente la dirección introducida en Mailchimp ni datos de otro proyecto.

## Ya cerrado

Newsletter de pruebas conectada y comprobada contra Mailchimp separado: pending, doble confirmación personal de Xavier, subscribed, baja desde preferencias del suscriptor y 409/formulario oficial al solicitar alta de nuevo. Contacto de QA dejado de baja, sin campañas. Ver docs/newsletter-preview.md.

## Puntos para retomar

- Revisar git status y este documento antes de editar. Rama preview; los dos commits previos de documentación de Mailchimp están conservados.
- Aplicación actualmente servida antes de este trabajo: a7afb01e, dpl_CyT2PgQqjBFvRKQ9Gkzh6dJx9qEG, https://preview.energiaydivinidad.com. La configuración Mailchimp está cargada en ese despliegue.
- Referencias exactas de QA en .local-private/preview-qa-2026-10-27 y scripts de lectura en /private/tmp. No copiar secretos a este documento ni al chat.
- Bre-B QR/importe pendiente: BREB-48a2aa96-88d8-4ec1-a723-2c58bb8151d1, importe ficticio 80.000 COP.
- PayPal sesión pendiente de clic personal: PP-aece0b11-cfd7-42cd-9a39-a5fec6dc2a60, 100 USD ficticios, 2/11/2026 14:00 Colombia, 90 minutos. Confirmar estado actual antes de preparar otra orden. Taller PayPal aún sin completar.
- Antes de commit, incluir explícitamente la nueva migración: prisma/migrations está ignorado históricamente; no añadir las demás migraciones locales ignoradas.
