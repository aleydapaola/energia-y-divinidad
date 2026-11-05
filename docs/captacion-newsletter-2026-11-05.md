# Captación de newsletter — Preview, 05/11/2026

Xavier autoriza la implementación combinada: página dedicada, formulario visible
en inicio, invitación discreta y acceso permanente desde pie/contenido. Después
establece mobile first como norma permanente y autoriza continuar durante su
ausencia, consultando únicamente archivos relacionados con este proyecto.
Production requiere aprobación posterior de la versión concreta.

## Alcance

- `/meditacion-gratis`: página propia del regalo del Ángel de la Guarda, duración
  real 18:43, identidad/foto de Aleyda y formulario sin exigir cuenta.
- Inicio: formulario después de la primera presentación; enlace de recordatorio
  final. Cabecera, pie y blog enlazan o reutilizan el mismo circuito.
- Formulario común: email, aceptación explícita sin marcar, privacidad y botón
  «Recibir mi meditación y suscribirme». Confirmación por correo conservada.
  Mensaje de pendiente persistente; no desaparece a los cinco segundos.
- Mailchimp y Resend existentes, misma audiencia por entorno y mismo regalo.
  No se duplican contactos ni envíos, ni se reactiva una baja. Los clientes
  antiguos de la API conservan compatibilidad durante el despliegue; los nuevos
  formularios deben aportar aceptación, versión y origen válidos.
- Invitación no modal: compacta en ordenador y panel en móvil; no bloquea ni roba
  el foco. Prueba inicial de 15 segundos **y** 35 % de desplazamiento; son hipótesis
  configurables, no un óptimo demostrado. Excluye cuenta, auth, reservas, pagos,
  admin, landing y reproductor. Se oculta ante carrito/diálogos y al escribir.
  Una aparición por pestaña; cierre guardado 14 días. Tras una solicitud, ocultación
  30 días; si ya estaba suscrita, un año. Se oculta a usuarios autenticados, sin
  deducir que todos estén suscritos. No funciona como identificación entre dispositivos.

## Medición

- Asignación aleatoria 50/50 por pestaña a control o invitación, estable mientras
  dura la pestaña. Los formularios están disponibles en ambos grupos.
- Contadores diarios agregados por ubicación, variante, pantalla y evento. No
  guardan IP, correo, URL de referencia ni ID de visitante. El navegador evita
  repetir el mismo evento/ubicación/día en esa pestaña; no es analítica de personas.
- Primer origen y evidencia de consentimiento por audiencia/dirección mediante
  HMAC; no otra copia del email. La confirmación la marca exclusivamente el servicio
  que ya valida la identidad/estado de Mailchimp, no el navegador.
- ADMIN Comunicaciones muestra los últimos 30 días. Distingue confirmadas,
  pendientes, existentes e inactivas. Son altas de estos formularios, no todas las
  cuentas ni el estado actual tras una baja. No mide reservas o ingresos.
- Tasas orientativas: la asignación por pestaña, almacenamiento bloqueado y
  cambios de dispositivo limitan las conclusiones. No declarar ganador con poco
  tráfico ni comparar el porcentaje de landing con popup como públicos equivalentes.
- Dos tablas aditivas, sin backfill ni modificación de contactos o compras.
  Migración `20261105090000_newsletter_capture` exclusivamente Preview hasta aprobación.
  Los errores de atribución no bloquean el regalo; las altas nuevas conservan
  evidencia antes de solicitar la suscripción al proveedor.

## Comprobación y límites

En preparación. Guardar aquí SHA/despliegue y resultados móviles antes de cerrar.
No repetir las compras sandbox ni las altas/regalos anteriores; el contacto QA
del alias permanece de baja. Las pruebas reales de correo solo pueden usar el
destinatario autorizado de Preview. No activar secuencias comerciales nuevas ni
enviar campañas. Cambios de navegación ADMIN limitados a poder usar Comunicaciones
en pantallas estrechas, con navegación horizontal y contenido que puede encogerse.

Referencias de diseño: [Google](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials),
[NN/G](https://www.nngroup.com/articles/popups/),
[Omnisend](https://www.omnisend.com/blog/email-popup-statistics/).
Los benchmarks no son una predicción de conversión para Aleyda.
