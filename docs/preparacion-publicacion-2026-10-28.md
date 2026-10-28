# Preparación de publicación — pendiente de aprobación

No se ha publicado Production. Esta preparación no autoriza cambiar servicios reales, migrar su base o integrar main.

## Versión revisable

- Aplicación: 497916f9b9e012ebab6c94747a92ab6ebae4bf35, rama preview, repositorio aleydapaola/energia-y-divinidad.
- Vercel EYD: proyecto prj_unjgBqGNUdLMP4TtRdvBMqKgxmcV, equipo team_1whYgceEyjMN8Ni9tLEOWbNx / aleyda-paola-vargas-projects.
- Ready: dpl_9EPEDsR8SjBH1EHYMoeKdZVG7zDj. Enlace https://preview.energiaydivinidad.com y alias técnico asignados.
- Production conservada: 7b9a7ac3f8ee65ea6f7e80a9cc7460a62c0c17cd, dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc. Revalidar antes de cualquier publicación y guardar referencia recuperable de esa versión.
- 143 pruebas automáticas, tipos y lint de cambios correctos. Migración nueva de retenciones aplicada solo a Neon Preview y guardada en Git; sin backfill de reservas históricas.

## Evidencia de pagos y reservas

Las ocho compras ficticias de la matriz han alcanzado entrega: producto, curso, sesión y taller por Bre-B simulado y PayPal sandbox. La sesión y taller PayPal finales se completan personalmente por Xavier. Capturas, comprador dedicado, webhook sin errores, reserva/acceso por pedido y retenciones consumidas verificados. La evidencia detallada y los límites se mantienen en docs/matriz-pruebas-preview.md y docs/cierre-preview-2026-10-27.md.

La disponibilidad incluye retenciones de 20 minutos y se vuelve a comprobar antes de capturar. CAPTURING/REPORTED no se liberan por un simple timeout. La entrega reemplaza la retención bajo el bloqueo de inventario. Pruebas reales de concurrencia/rollback contra Neon Preview, además del recorrido web libre→retenido→libre al cancelar sin pagar. No se han cobrado ni devuelto fondos reales.

Nuevo taller PayPal: 19 plazas libres antes, 18 durante retención y 18 después de confirmar, una reserva, una asignación y un entitlement. Correo recibido en Proton con referencia, importe y hora de Colombia; inscripción visible con el CLIENT. Recarga sin duplicado. Una retención no equivale a confirmar el ingreso.

## Dependencias: revisión nueva antes de Production

El aviso de la compilación se ha clasificado con npm audit --omit=dev: 66 entradas, de las que 6 están etiquetadas critical y 35 high. Incluye dependencias directas y transitivas; no equivale a demostrar que todas las condiciones sean explotables en Vercel. Prioridad siguiente: verificar advisories, aplicar correcciones compatibles en Preview y repetir pruebas de autenticación/compra, sin ejecutar audit fix --force. Informe privado ignorado por Git; package.json y lockfile intactos en este cierre. Esta versión no se presenta como lista para Production.

## Contenidos y legal que faltan

1. **Identidad fiscal y dirección pública.** El usuario aporta una base de NIT con dos posibles dígitos. Comprobación aritmética local según el método publicado por DIAN: candidato DV 3. No acredita registro ni sustituye cotejo con RUT; no se añade como NIT confirmado. Pendiente dirección de notificación que Aleyda autorice publicar. La dirección postal de Mailchimp no se reutiliza sin esa autorización. El artículo 50(a) enumera la identidad, NIT, dirección y contactos para comercio electrónico: [texto oficial de la DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm).
2. **Condiciones particulares de otros productos.** Mantener la política aprobada de sesiones individuales. No extender automáticamente sus 24 horas a cursos, eventos, membresías o archivos digitales. Completar la revisión de esas condiciones y del ejercicio de derechos aplicables antes de usar los borradores como términos definitivos. No publicar una exclusión general de devoluciones ni automatizar refunds sin decisión específica.
3. **Promesa de bienvenida.** Xavier decide mantenerla y usar provisionalmente `#`. Contenido guardado en Final welcome email de Mailchimp de pruebas y borrador local docs/newsletter-bienvenida-preview.html con ese enlace y aviso visible de Preview. No se acredita entrega de una meditación real: sustituir el enlace, comprobarlo y probar el envío antes de Production. Alta/baja técnica de Mailchimp ya comprobadas.
4. **Contenidos reales.** Los borradores legales son fallback exclusivo de Preview; aprobar y trasladar selectivamente los documentos finales al CMS de Production. No copiar fixtures PRUEBA/NO REAL, archivos TXT sintéticos ni el dataset completo. Git no publica automáticamente los documentos de Sanity.

## Configuración real preparada para revisar, sin activarla

- Neon: aplicar la migración aprobada solo después de verificar el destino Production y su historial. Mantener la base Preview aislada; no sustituir su URL por la real.
- Global66/Bre-B: llave, titular y QR reales ratificados por Xavier y guardados únicamente en el directorio privado ignorado. El QR de cuenta es estático, sin importe ni caducidad; el plazo de 20 minutos corresponde a la retención de la hora/plaza. Antes de activar revisar GLOBAL66_BREB_VERIFIED, KEY, KEY_TYPE, RECIPIENT y QR en el proyecto correcto. No usar el QR ficticio ni copiar datos bancarios al repositorio.
- PayPal: verificar credenciales y webhook live de EYD, importe/moneda y dominio de retorno; no usar el comprador sandbox ni credenciales de ASA. No hacer cobros reales de prueba por este plan.
- Correo, Calendar y Mailchimp: revisar los ámbitos reales preservados y los destinatarios; no trasladar audiencia, calendario ni clave de pruebas a Production. La clave nueva Mailchimp está limitada a la rama preview y no se puede revelar desde Vercel.
- Sanity: el contenido real requiere selección y aprobación; Preview sigue en 81jpalr2/preview y no tiene token de escritura de Production.

## Alcance y decisión de publicación

La matriz valida los cuatro tipos de compras de una sola vez por PayPal/Bre-B. No acredita pagos recurrentes, suscripciones, Wompi o Nequi legacy. Se retiran con 410 las dos entradas antiguas de membresía que aceptaban importes del navegador. La interfaz actual utiliza la ruta de suscripción separada; no se modifica ni se presenta como probada por estas ocho compras. Comprobación local: ambas entradas rechazan antes de acceder a proveedores o crear pedidos. No activar nuevas suscripciones de prueba.

Cuando se cierren los datos/contenidos y el alcance, presentar enlace de Preview, commit exacto, comprobaciones y límites a Xavier. Solo su aprobación de esa versión autoriza integrar/publicar. En el despliegue aprobado contrastar el código de aplicación con el revisado y validar dominio, recursos y referencia de retorno. Conservar la tabla aditiva de retenciones al volver a la versión anterior: el código antiguo puede ignorarla y no es necesario borrar sus registros para deshacer una publicación.
