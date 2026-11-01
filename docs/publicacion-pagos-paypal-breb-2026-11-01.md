# Publicación de PayPal y Bre-B

Instrucción de Xavier: PayPal y Bre-B · Global66 son los únicos sistemas de pago. Preparar y probar Preview cuanto antes; Production requiere aprobación explícita de la versión concreta. Este documento sustituye los pendientes históricos sobre conservar Wompi o Nequi.

## Candidato

Base verificada: preview 4da7083959fca3c86dbea2ad40796dbb06e76b0d, sin cambios pendientes al comenzar. Repositorio aleydapaola/energia-y-divinidad; proyecto Vercel prj_unjgBqGNUdLMP4TtRdvBMqKgxmcV, equipo team_1whYgceEyjMN8Ni9tLEOWbNx. Preview: https://preview.energiaydivinidad.com.

- Eliminados clientes/adaptadores Wompi y Nequi, formularios/componentes antiguos y servicio local de cobros recurrentes. Eliminada la programación del cron de cobros.
- Dieciséis entradas antiguas responden 410 sin cargar proveedores, autenticación, datos o correo. Las siete páginas antiguas remiten a un aviso con acceso a compras y contacto, sin nuevas instrucciones bancarias.
- El carret del curso y los selectores solo admiten PayPal/Bre-B (FREE conserva cursos gratuitos, no es otro proveedor). El procesador compartido rechaza métodos retirados, aunque el pedido histórico conste completado.
- Confirmación ADMIN limitada a Bre-B. Se mantiene comprobación de importe, referencia bancaria única y entrega existente. PayPal mantiene captura/firma/importe/moneda, protección de acceso e idempotencia.
- Revisión CLIENT detecta que el resumen de Mi Cuenta usaba la zona del servidor: corregido a America/Bogota y etiqueta explícita, sin modificar instantes ni reservas. Prueba de renderizado de la página real en UTC/Madrid/Tokio y cambio de día correcta.
- Las membresías nuevas se conceden solo por el conciliador recurrente PayPal. La consulta de estado es de lectura, sin consultar Nequi ni conceder acceso. Cambio de nivel y reactivación antiguos quedan retirados; el cliente tiene el contacto de Aleyda.
- Datos, enums y campos antiguos de Prisma se conservan para historial y auditoría; no constituyen métodos activos. Un acuerdo antiguo sin vínculo PayPal no se anuncia como cancelado en el proveedor. Necesita conciliación personal antes de Production.

## Comprobaciones

- 179 pruebas automáticas correctas, incluyendo rechazo sin efectos de las 16 entradas en Production/Preview/desarrollo, carret con métodos manipulados, registro de proveedores y bloqueo de entrega con métodos retirados.
- Tipos correctos y lint sin errores (avisos previos conservados).
- Controles locales de Neon/servicios correctos. SELECT 1 correcto en endpoint pooled y directo de Neon Preview.
- QA real de inventario: concurrencia de última plaza/hora, expiración solo sin pago, retención ante captura incierta, entrega y rollback. Fixtures efímeras retiradas, históricos preservados, sin APIs de pagos/correo/Calendar.
- QA real de membresías en Neon Preview: entrega concurrente única, eventos/ventas repetidos, cancelación conserva acceso y rollback atómico. Fixtures efímeras retiradas; proveedor/correo simulados.
- El primer build sin acceso de red no pudo consultar Neon. No se considera aprobado por compilar el código; se repite con acceso a Preview y se registra el resultado abajo.
- Las ocho compras anteriores acreditan las cuatro categorías por Bre-B simulado y PayPal sandbox. No repetir cobros ficticios sin necesidad ni confundirlas con una autorización recurrente completa.

## Cierre de Preview antes de pedir publicación

1. Build completo, commit en origin/preview y despliegue Ready. Cotejar proyecto/equipo/repo/ref/SHA y actualizar ambos alias al mismo despliegue.
2. Verificar remotamente retiradas 410, páginas antiguas sin instrucciones, acceso anónimo rechazado, formularios PayPal/Bre-B y controles de importes; revisar Mis Compras/Sesiones/Cursos/Eventos sin alterar históricos.
3. Membresía mensual con prueba: Xavier acepta personalmente los consentimientos y la autorización sandbox. Comprobar retorno, un Subscription/Entitlement, fecha del primer cobro y correo recibido. Cancelación sandbox de la renovación, conservación del acceso y aviso. Comprobar alta sin repetir prueba y facturación anual según el plan existente. No falsear historial ni simular un webhook como prueba de un cobro del proveedor.

## Configuración real revisada por metadatos

La lista Production de Vercel no incluye PAYPAL_WEBHOOK_ID ni GLOBAL66_BREB_*. Los cuatro IDs de planes PayPal USD sí existen, pero su presencia no verifica que sean live ni que sus precios sean correctos. No se han leído claves ni cambiado variables. Configurar y verificar estos elementos forma parte del paso aprobado a Production; publicar Git sin ello dejaría el circuito incompleto.

## Paso a Production, solo tras aprobar versión concreta

1. Releer despliegue servido por www.energiaydivinidad.com y guardar referencia recuperable. Último observado: 7b9a7ac3f8ee65ea6f7e80a9cc7460a62c0c17cd / dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc. No usar main local como prueba de lo publicado.
2. Inventario de pedidos pendientes y acuerdos anteriores por proveedor, solo lectura. Resolver manualmente ingresos/capturas en curso y suscripciones fuera del flujo PayPal v2; retirar código no cancela acuerdos bancarios externos. No trasladar automáticamente acuerdos ni cobrar otra vez.
3. Preparar una instantánea recuperable de la base Production y comprobar las migraciones/checksums. El cambio nuevo de esta tarea no añade migraciones. El candidato acumulado añade checkout_holds: migración aditiva ya probada en Preview, sin borrar tablas/campos ni reescribir datos históricos. Aplicarla únicamente como parte de la publicación aprobada. Volver al código anterior no elimina esa tabla.
4. Configuración Production del mismo proyecto: PayPal live con credenciales, webhook y planes live cotejados con precios/moneda/períodos del catálogo; Bre-B con VERIFIED, KEY, KEY_TYPE, RECIPIENT y QR estático real ya ratificados. Escaneo bancario final de llave/titular/importe antes de habilitarlo. No usar sandbox, datos ficticios ni secretos de ASA.
5. No copiar Neon/Sanity/Resend/Calendar/Mailchimp de Preview a Production. Sanity no se traslada al integrar Git: excluir documentos y assets sintéticos de QA, preservar el catálogo real. Revisar borradores legales/identificación fiscal y contenidos pendientes antes de la publicación de la web completa.
6. Integrar exclusivamente el código revisado, verificar SHA servido y URLs. Comprobación sin cobro real de métodos/configuración, acceso, catálogo y páginas. Supervisar webhook, errores y entregas; un fallo detiene la apertura de compras y se revierte al despliegue anterior. No repetir capturas ni reembolsar automáticamente.

## Resultado remoto del candidato

2be894e0 Ready en dpl_LTDbiUR52T1BWJi5QqA7V2ZGZ26H, fuente/equipo/proyecto correctos. 34 comprobaciones remotas correctas: 410 de entradas retiradas, redirecciones, páginas, rechazo de acceso anónimo e importe manipulado. Sin pagos/pedidos/correos. Production sigue en su despliegue anterior.

La prueba personal detectó una autorización Esencia pendiente del 28/10 bloqueada por el límite de 60 horas. Se añade /membresia/pendiente y enlaces desde checkout/Mis Compras. Recuperación solo de lectura, verificada contra PayPal, sin nuevo acuerdo ni reinicio de prueba; primer cobro original explícito. 179 pruebas y tipos correctos. Build y despliegue de esta corrección, lectura real del estado en PayPal y autorización personal aún pendientes.
