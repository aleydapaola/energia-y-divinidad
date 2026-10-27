# Compras PayPal y Bre-B en Preview

Estado revisado el 27 de octubre de 2026. Alcance: cursos, talleres y eventos, productos digitales y sesiones de canalización. Cancelaciones y reembolsos quedan fuera de este cambio.

## Global66 y Bre-B

- [Información comercial de Global66 sobre Bre-B](https://www.global66.com/co/educacion-financiera/).
- **Criterio confirmado por Xavier el 27/10/2026, ratificando el del 26/10: el QR facilitado es estático, sin importe y sin caducidad por pedido.** Se reutiliza el mismo QR entre pedidos. El cliente introduce el importe exacto en COP que muestra la web. La llave facilitada se prepara como tipo alias, conservando la @ inicial; el valor y la imagen reales se guardan fuera del repositorio. No se genera un QR distinto por compra ni se le asigna una fecha de expiración.
- La llave y el QR se verificaron el 26/10/2026 descodificando el propio QR: el payload EMV indica punto de inicio `11` (estático), moneda `COP`, la misma llave que se configura en `GLOBAL66_BREB_KEY`, ausencia del campo de importe y el titular del estándar truncado a 25 caracteres (`Aleyda Paola Vargas Galvi`). Ese truncamiento es una limitación del formato, no un dato erróneo; el nombre completo configurado es `Aleyda Paola Vargas Galvis`.
- Cotejo local repetido el 27/10 sobre el QR preparado: descodificación completa, indicador estático, moneda COP, sin campo de importe y coincidencia con la llave que Xavier acaba de ratificar. Imagen y datos preparados en el almacenamiento privado ignorado por Git. No se han modificado variables ni despliegues de Production en esta confirmación.
- Como el QR y la llave no llevan importe, **el control compensatorio es la verificación del ingreso**: la confirmación ADMIN exige declarar el importe realmente recibido en COP y rechaza la confirmación (409) si no coincide con el del pedido, salvo que se registre un motivo en la auditoría. El aviso o comprobante del cliente nunca activa el pedido.
- [Los webhooks `MONEY_RECEIVED` y la API transaccional se documentan para integraciones B2B](https://documents-b2b.global66.com/). La cuenta confirmada de Aleyda es personal, así que no hay generación dinámica de QR ni notificación automática de ingresos.
- Preview sirve un QR distinto y visiblemente falso (`PREVIEW_BREB_QR_URL`); si coincide con el valor de Production se ignora. En Production, Bre-B solo se habilita con la llave y el destinatario confirmados por Aleyda y `GLOBAL66_BREB_VERIFIED=true`. No se reutilizan los datos antiguos de Bancolombia.
- Diagnóstico: `GET /api/admin/payments/breb/health` (solo ADMIN) informa del estado de la configuración con la llave enmascarada, para no depender de un 503 opaco.

## Recorrido de compra

| Estado | Cliente | Aleyda / sistema |
| --- | --- | --- |
| Pedido Bre-B pendiente | Ve producto, importe COP, referencia e instrucciones; puede comunicar la referencia de transferencia y consultar el estado | Recibe un aviso de prueba en Preview; comprueba el ingreso en Global66 antes de confirmar |
| Pedido PayPal pendiente | Va a PayPal por el importe USD; puede volver a consultar el estado | La aplicación valida la captura de PayPal antes de entregar |
| Pago confirmado | Consulta el resultado y el acceso o la reserva en su cuenta | El procesador existente entrega curso/producto, inscripción a evento o reserva de sesión y prepara los correos |

La entrega de correos en Preview sigue limitada al destinatario de pruebas configurado. Las pruebas Bre-B no transfieren dinero; las pruebas PayPal requieren el entorno sandbox.

## Antes de aprobar Production

1. Confirmar en Vercel que el proyecto y equipo son los de Aleyda y que el despliegue Preview sirve el commit revisado.
2. Probar en Preview los cuatro tipos de producto, ambos métodos disponibles, estados pendientes, confirmación manual y entrega, con datos ficticios y PayPal sandbox.
3. Verificar con Aleyda la llave, el titular y el QR definitivos. Escanear el QR con una aplicación bancaria distinta y comprobar que el titular coincide y que pide el importe. Configurar `GLOBAL66_BREB_VERIFIED`, `GLOBAL66_BREB_KEY`, `GLOBAL66_BREB_KEY_TYPE`, `GLOBAL66_BREB_RECIPIENT` y el QR (`GLOBAL66_BREB_QR_DATA_URL` o `GLOBAL66_BREB_QR_URL`) solo en el ámbito Production.
4. Aprobar el commit concreto para Production. Tras publicarlo, comprobar el commit servido por el dominio y conservar la referencia anterior para poder volver atrás.
