# Compras PayPal y Bre-B en Preview

Estado revisado el 25 de octubre de 2026. Alcance: cursos, talleres y eventos, productos digitales y sesiones de canalización. Cancelaciones y reembolsos quedan fuera de este cambio.

## Global66 y Bre-B

- [Global66 explica que sus cuentas personales admiten llaves Bre-B y QR de un solo uso, con un importe específico o sin importe](https://www.global66.com/co/educacion-financiera/).
- **Decisión de la titular (26/10/2026): el QR de Bre-B que se usa es estático y no lleva importe.** Sustituye la regla anterior, que prohibía reutilizar un QR entre pedidos. El motivo es que el QR emitido por Global66 para la cuenta es equivalente a publicar la llave: identifica al receptor, no una cantidad. El cliente teclea el importe exacto en su aplicación bancaria. Un QR con importe fijo, si algún día se usara, sí sería de un solo uso y caducaría.
- La llave y el QR se verificaron el 26/10/2026 descodificando el propio QR: el payload EMV indica punto de inicio `11` (estático), moneda `COP`, la misma llave que se configura en `GLOBAL66_BREB_KEY`, ausencia del campo de importe y el titular del estándar truncado a 25 caracteres (`Aleyda Paola Vargas Galvi`). Ese truncamiento es una limitación del formato, no un dato erróneo; el nombre completo configurado es `Aleyda Paola Vargas Galvis`.
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
