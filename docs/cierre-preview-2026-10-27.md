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

## Cierre verificado — 28/10/2026

Preview ea9a0a80c630173342b44d7512ab9212a1e27889 Ready en dpl_GjaRRtK3Svq6TKR3fTWzQsRQZrYV. Proyecto/equipo/repositorio/ref/ambos alias verificados. Checkout móvil en iPhone SE 375×667 revisado en URL nueva: una cabecera, sin pie público ni WhatsApp superpuesto, resumen y formulario accesibles. Las primeras capturas del navegador conservaban la página anterior; la navegación nueva y HTML servido confirman la corrección. Cuenta móvil mejorada localmente con selector compacto; escritorio conserva sus enlaces.

**Ocho compras completadas.** Producto, curso, sesión y taller, por Bre-B simulado y PayPal sandbox. Relectura final de Neon confirma cuenta CLIENT correcta, entrega única por pedido y ausencia de errores en las cuatro capturas/webhooks PayPal. No hay nuevas transferencias, cobros reales ni devoluciones. Se conservan los históricos.

Sesión PayPal PP-aece0b11-cfd7-42cd-9a39-a5fec6dc2a60: una cita el 2/11 a las 14:00 Colombia, 90 minutos, contador cero y retención consumida. CLIENT, recibo con política y Google externo verificados: un evento de pruebas 14:00–15:30. La cita Bre-B del mismo día permanece 10:00–11:30. No repetir el pago.

Taller PayPal PP-892a06dc-67c5-4640-999f-9b0755b54512: Xavier completa personalmente el pago de 20 USD ficticios. Una reserva CONFIRMED el 15/12 a las 10:00 Colombia, una asignación, un entitlement y retención consumida. Disponibilidad 19→18 durante el pago y 18 al finalizar; no se descuenta dos veces. Confirmación recargada, CLIENT muestra las dos inscripciones previstas (Bre-B y PayPal), recibo con referencia exacta/hora/importe/enlace de Preview recibido en Proton.

**143 pruebas automáticas**, tipos y lint de cambios correctos. Preparada retirada con 410 de las dos entradas antiguas de membresía que aceptaban precios del navegador; la interfaz actual usa la ruta de suscripción separada. No se han activado ni probado nuevas suscripciones recurrentes. Eliminado log de datos de usuario de Mi Cuenta. Últimos cambios desplegados: 497916f9b9e012ebab6c94747a92ab6ebae4bf35, Ready en dpl_9EPEDsR8SjBH1EHYMoeKdZVG7zDj. Ambos alias y fuente verificados. Las dos rutas antiguas devuelven 410 remotamente. Selector móvil comprobado en iPhone SE: Mis Eventos muestra las dos inscripciones y seleccionar Mis Sesiones navega correctamente, con las citas de 90 minutos.

## Newsletter y regalo

Newsletter separada comprobada: pending, confirmación personal de Xavier, subscribed, baja desde preferencias y 409/formulario oficial al pedir alta otra vez. QA dejado de baja y sin campañas. Ver docs/newsletter-preview.md.

Xavier mantiene la promesa de meditación e indica usar `#` provisionalmente. Borrador guardado también en Final welcome email de Mailchimp de pruebas; HTML local en docs/newsletter-bienvenida-preview.html: botón con ese enlace y aviso de Preview. Falta enlace real y prueba de entrega de ese regalo antes de Production; no confundir alta/baja técnica con entrega de contenido. No se ha activado ningún envío ni probado una descarga real. Verificar también la opción de envío final antes de usar el regalo: el editor no mostraba ese control en la interfaz consultada.

## Datos legales y publicación

Correo público autorizado: contacto@energiaydivinidad.com. Sigue pendiente dirección postal de notificación autorizada; no copiar la de Mailchimp. NIT no cotejado con RUT: cálculo local según algoritmo DIAN da candidato DV 3, pero no acredita registro fiscal. Mantener la cédula etiquetada como cédula y no publicar un NIT supuesto. Condiciones de otros productos pendientes de revisión, sin extender automáticamente las de sesiones.

Preparación concreta de publicación y límites: docs/preparacion-publicacion-2026-10-28.md. Production sigue sin autorización de publicación y conserva 7b9a7ac3/dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc. No integrar main ni copiar el dataset de pruebas.

## Puntos para retomar

- Revisar rama/status y este documento. Trabajo solo preview, URL https://preview.energiaydivinidad.com protegida y noindex.
- Últimas pruebas locales 143 correctas; aplicación desplegada 497916f9, Ready en dpl_9EPEDsR8SjBH1EHYMoeKdZVG7zDj.
- QA privado ignorado: .local-private/preview-qa-2026-10-27, prueba final de ocho órdenes final-order-proofs.jsonl. No copiar secretos al informe.
- Las ocho compras, Bre-B QR/importe y calendario ya están cerrados. No solicitar nuevos pagos ficticios para repetirlos.
- Retenciones ya desplegadas y migración incluida en Git: no volver a crearla ni añadir otras migraciones ignoradas.
- Prioridad técnica nueva: clasificar y corregir dependencias antes de proponer Production. npm audit --omit=dev informa 66 entradas (6 critical, 35 high, 24 moderate, 1 low); no prueba explotabilidad de todas en este despliegue. Informe privado dependency-audit-production.json. No se aplicó audit fix ni se alteró el lockfile.
- Restan datos legales y enlace real de meditación, completar textos finales, aprobación de versión concreta y configuración/publicación de Production posterior. No activar servicios reales por este plan.
