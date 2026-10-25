# Compras PayPal y Bre-B en Preview

Estado revisado el 25 de octubre de 2026. Alcance: cursos, talleres y eventos, productos digitales y sesiones de canalización. Cancelaciones y reembolsos quedan fuera de este cambio.

## Global66 y Bre-B

- [Global66 explica que sus cuentas personales admiten llaves Bre-B y QR de un solo uso, con un importe específico o sin importe](https://www.global66.com/co/educacion-financiera/). Un QR estático compartido entre pedidos no sirve como QR de un solo uso para importes diferentes.
- [Los webhooks `MONEY_RECEIVED` y la API transaccional se documentan para integraciones B2B](https://documents-b2b.global66.com/). La [página comercial de la API de notificaciones](https://doc-b2b.global66.com/empresas/api-webhooks/) también la presenta para Global66 Business. La cuenta confirmada de Aleyda es personal. En la documentación pública consultada no aparece una API para crear QR por pedido, consultar ingresos o recibir notificaciones de esa cuenta personal.
- El flujo implementado para la cuenta personal es manual: el servidor crea un pedido pendiente con importe COP y referencia, muestra la llave verificada cuando esté disponible, acepta que el cliente comunique la referencia del movimiento y deja el pedido pendiente. Aleyda comprueba el ingreso en Global66 y confirma desde el panel. El aviso o comprobante del cliente nunca activa el pedido.
- Preview simula el flujo Bre-B y no muestra datos bancarios reales. En Production, Bre-B solo se habilita después de configurar la llave y el destinatario confirmados por Aleyda. No se reutilizan los datos antiguos de Bancolombia.
- El código admite mostrar un QR únicamente si se ha asociado **a ese pedido** una imagen verificada con el mismo importe en COP y fecha de caducidad futura. No existe generación ni carga automática de QR. Hasta contar con un procedimiento verificable para obtener un QR distinto por pedido, la llave es el medio Bre-B operativo previsto.

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
3. Verificar con Aleyda la llave y el destinatario Global66. Para mostrar QR, definir un procedimiento por pedido que acredite importe, moneda, destinatario y caducidad.
4. Aprobar el commit concreto para Production. Tras publicarlo, comprobar el commit servido por el dominio y conservar la referencia anterior para poder volver atrás.
