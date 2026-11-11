# Captación de newsletter — Preview, 05/11/2026

Seguimiento principal desde el 10/11/2026:
[`PLA_MESTRE_NEWSLETTER.md`](PLA_MESTRE_NEWSLETTER.md). Allí se mantienen las
tareas, evidencias, pendientes y el prompt de continuación entre cuentas.
Este documento conserva los requisitos previos y el historial técnico; no
presentar sus bloqueos antiguos como estado actual sin contrastarlos.

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

Implementación presente en el código local; cierre de verificación pendiente.
La revisión del 09/11/2026 figura abajo. No interpretar esta nota como prueba de
la versión que sirve actualmente Preview ni como autorización de Production.
No repetir las compras sandbox ni las altas/regalos anteriores; el contacto QA
del alias permanece de baja. Las pruebas reales de correo solo pueden usar el
destinatario autorizado de Preview. No activar secuencias comerciales nuevas ni
enviar campañas. Cambios de navegación ADMIN limitados a poder usar Comunicaciones
en pantallas estrechas, con navegación horizontal y contenido que puede encogerse.

Referencias de diseño: [Google](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials),
[NN/G](https://www.nngroup.com/articles/popups/),
[Omnisend](https://www.omnisend.com/blog/email-popup-statistics/).
Los benchmarks no son una predicción de conversión para Aleyda.

## Requisitos recuperados y contraste — 09/11/2026

Objetivo: aumentar las **suscripciones confirmadas** aprovechando el regalo ya
existente. No basta contar formularios enviados. La propuesta aceptada combina
los cuatro puntos de captación; no hay que elegir uno ni rehacer la newsletter.
Se conserva el alcance acordado arriba.

| ID | Requisito y criterio de aceptación | Evidencia local y pendiente |
| --- | --- | --- |
| CAP-01 | Landing `/meditacion-gratis`, identidad de Aleyda, regalo del Ángel de la Guarda de 18:43 y alta sin cuenta. Acceso directo al formulario en móvil. | `app/meditacion-gratis/page.tsx`. CTA `#recibir` y encuadre de foto son retoques locales descritos en el seguimiento anterior; falta QA visual. |
| CAP-02 | Formulario visible después de la primera presentación de inicio, recordatorio final y accesos desde cabecera, pie y blog. Reutilizar el mismo circuito. | `app/page.tsx`, `app/blog/page.tsx`, `components/layout/Header.tsx`, `Footer.tsx` y `components/newsletter/MeditationSignup.tsx`. Falta comprobar navegación servida en móvil. |
| CAP-03 | Email, aceptación explícita sin marcar, privacidad y acción «Recibir mi meditación y suscribirme». Mensaje pendiente persistente y errores comprensibles. | `NewsletterForm.tsx` y `/api/newsletter`. Pruebas simuladas correctas. No cambiarlo por criterios históricos de registro ya sustituidos. |
| CAP-04 | Conservar doble confirmación para el formulario independiente y entrega del regalo tras confirmar. Registro de cuenta mantiene su circuito aprobado de verificación de identidad, sin otro correo de confirmación de newsletter. | Servicios de regalo/registro y pruebas cruzadas. No repetir correos o altas reales ya comprobados. |
| CAP-05 | Una suscripción por dirección/audiencia y un regalo en ambos órdenes newsletter→cuenta y cuenta→newsletter, también con concurrencia. Respetar bajas y ofrecer reinscripción voluntaria. | `tests/newsletter-gift.test.mjs`, `registration-newsletter.test.mjs` y `newsletter-readiness.test.mjs`, ejecutados con dependencias simuladas. |
| CAP-06 | Invitación no modal a los 15 s **y** 35 % de scroll, reparto 50/50 estable por pestaña, rutas excluidas y sin interferir con carrito, diálogos o escritura. | `NewsletterInvitation.tsx` y `newsletter-capture-rules.ts`. **Diálogo posterior corregido localmente**, con prueba de regresión móvil y de escritorio; pendiente de revisión visual y despliegue. Los umbrales siguen siendo hipótesis. |
| CAP-07 | Una aparición por pestaña; cierre 14 días; solicitud 30 días; ya suscrita un año. Oculta con sesión iniciada, sin deducir el estado de suscripción. | Componente y `newsletter-capture-client.ts`. Falta verificación de interacción y persistencia en navegador. |
| CAP-08 | Medir origen (inicio, pie, landing, invitación, blog, Instagram y WhatsApp), variante y pantalla; separar pendientes, confirmadas, existentes e inactivas. Confirmación acreditada por el servicio, nunca por el navegador. | Servicio de captación, endpoints de métricas/ADMIN y `NewsletterCaptureAdmin.tsx`. Pruebas de agregados y permisos correctas; falta revisar el panel servido. |
| CAP-09 | Métricas agregadas sin email, IP, referencia o identificador de visitante; consentimiento y primer origen mediante HMAC por audiencia/dirección. No bloquear el regalo por fallos de atribución. | Servicios y pruebas locales. No confundir suscripciones históricas con el estado actual después de una baja, ni estas tasas con personas únicas o ingresos. |
| CAP-10 | Verificar primero 375 px y después escritorio: legibilidad, controles táctiles, formulario, cierre, enlaces y ausencia de superposiciones. Preview aislado y proveedores de prueba. | **Pendiente de entorno**: no hay navegador aislado disponible y Preview devuelve 302 hacia autenticación de Vercel. Las pruebas simuladas no certifican estos criterios. |

### Comprobaciones nuevas

- Referencias locales leídas: rama `preview`; HEAD y `origin/preview` local
  `75edba4c5d5eb3387be59803535c339890a6206e`. No se ha hecho fetch ni se
  certifica el remoto a partir de estas referencias.
- `git status --short --branch` y `git branch --show-current` fallan por
  `xcrun: error: invalid active developer path ... missing xcrun`. No se ha
  reparado el sistema ni sustituido Git. Los cambios pendientes no se pueden
  certificar con Git; no se ha modificado código de aplicación.
- Vinculación local `.vercel/project.json`: proyecto `energia-y-divinidad`,
  `prj_unjgBqGNUdLMP4TtRdvBMqKgxmcV`, equipo
  `team_1whYgceEyjMN8Ni9tLEOWbNx`. Es configuración local, no una verificación
  del despliegue vivo. SHA/despliegue histórico `75edba4c` /
  `dpl_6gUN5MmwoAwr5ZL54dugmC1xReRw`, según `AUTONOMY_STATUS.md` anterior;
  no revalidado ahora.
- Solicitud anónima a la landing de Preview: HTTP 302 hacia SSO de Vercel,
  sin seguir la autenticación. No permite verificar el SHA servido.
- `cua.createBrowserTab("iab", ...)`: navegador no disponible;
  `cua.listBrowsers()`: `[]`. No se han abierto perfiles personales.
- `node --experimental-strip-types --test tests/newsletter-capture.test.mjs
  tests/newsletter-gift.test.mjs tests/registration-newsletter.test.mjs
  tests/newsletter-audio.test.mjs tests/newsletter-readiness.test.mjs`:
  **61/61 correctas**, con dependencias simuladas.
- `node node_modules/typescript/lib/tsc.js --noEmit --incremental false`:
  correcto. Se invocó directamente el compilador después de que el comando
  npm terminara con código 255 sin diagnóstico de TypeScript.
- ESLint ejecutado directamente en los once archivos de landing, componentes,
  servicios y endpoints de captación revisados: sin errores ni avisos.
- No se ha arrancado Next, Prisma o Studio ni ejecutado build, migraciones o
  integración con base real. `local:check` carga `.env*`; no se ha ejecutado
  ante la denegación vigente de lectura de esos archivos, ni se han eludido las
  protecciones de arranque.

### Diagnóstico previo: diálogo posterior a la invitación

Una comprobación en memoria del componente real, con hooks, reloj y DOM
simulados, reprodujo esta secuencia sin navegador ni servicios externos:

1. Un diálogo ya abierto impide mostrar la invitación.
2. Sin diálogo, cumplidos 15 s y 35 % de scroll, aparece la invitación.
3. Abrir después un elemento `[role="dialog"]` y ejecutar la comprobación
   periódica **deja la invitación visible**.
4. Empezar a escribir sí la oculta.

Antes de la corrección, la condición `busy` solo impedía abrir; el cierre de una invitación ya visible
solo comprueba la escritura en ese intervalo. Corrección prevista para CAP-06:
usar también la presencia de diálogo para ocultarla, manteniendo la regla de
una aparición por pestaña y sin reabrirla al cerrar el diálogo. Añadir una
prueba de regresión de esta secuencia y verificar después la superposición
en el navegador. En esta primera auditoría no se aplicó el cambio; la
continuación local autorizada después figura a continuación.

### Orden de continuación identificado en la primera auditoría

1. Recuperar Git operativo; contrastar cambios pendientes y verificar en Vercel
   dominio, equipo, proyecto, repositorio, rama y SHA actuales de Preview.
   Conservar los cambios previos; no reinstalar ni alterar el sistema desde
   esta tarea.
2. Corregir CAP-06 con su prueba de regresión, sin ampliar el alcance.
3. En navegador aislado, comprobar primero 375 px: CTA/formulario de landing,
   encuadre de foto, inicio, cabecera/pie/blog, apertura/cierre de invitación,
   diálogo posterior, escritura, carrito y preferencias. Revisar después
   escritorio y ADMIN Comunicaciones en el entorno de pruebas autorizado.
4. Con el entorno local autorizado y sus protecciones comprobadas, ejecutar
   las verificaciones que correspondan a la corrección, incluido build.
5. Preparar commit concreto y evidencias de Preview. Cualquier publicación en
   Production requiere aprobación específica de Xavier; esta recuperación no
   la concede.

No se añaden campañas, nuevos regalos, secuencias comerciales, cambios de
consentimiento, pagos ni gestión general de usuarios para cerrar captación.

## Continuación autorizada «endavant, mobile first» — 09/11/2026

### Corrección local y pruebas

- `NewsletterInvitation.tsx` usa ahora la misma condición de ocupación para
  ocultar una invitación visible e impedir abrir otra. La presencia de diálogo
  se comprueba también después de mostrarla. Se oculta en la siguiente
  comprobación del intervalo existente (cada segundo), sin nueva aparición en
  esa pestaña ni otro contador de impresión.
- Nuevo `tests/newsletter-invitation.test.mjs`: seis pruebas del componente real
  con hooks, reloj, DOM y almacenamiento simulados. Primero geometría móvil
  375×667: ambos umbrales de interacción, foco conservado, diálogo preexistente
  y posterior, escritura, cierre durante 14 días en otra pestaña y evento de
  solicitud de newsletter. Después se comprueba el diálogo posterior con
  geometría de escritorio 1440×900.
- Antes de corregir, fallaron exactamente los dos casos de diálogo posterior,
  móvil y escritorio. Después pasan los seis casos y las 61 pruebas anteriores:
  **67/67 correctas**. No se han repetido altas, envíos ni pruebas con proveedores.
- TypeScript sin emisión y ESLint del componente y la prueba: correctos.
  Las dimensiones simuladas **no verifican CSS, apariencia, teclado virtual,
  controles táctiles o ausencia visual de superposiciones**.

### Estado contrastado antes del cambio local

- Git sigue fallando por falta de `xcrun`. La rama se ha contrastado leyendo
  `.git/HEAD`: `preview`, SHA local `75edba4c5d5eb3387be59803535c339890a6206e`.
- Comparación de solo lectura con el índice Git v2: 735 entradas; cambios
  previos en `AGENTS.md`, landing, este documento, `package.json` y lockfile.
  El componente de invitación y la prueba de captación existente coincidían
  con el índice. No se detectaron entradas de conflicto ni eliminaciones en
  esa comparación. Una entrada restringida se excluyó sin leerla.
- Esa comparación no certifica cambios staged respecto de HEAD, archivos no
  seguidos ni estado remoto; no sustituye a `git status`. No se ha cambiado
  el índice, el historial ni los cinco archivos previos salvo este seguimiento.
- Nueva consulta HEAD anónima a la landing: 302 hacia `vercel.com`, sin seguir
  autenticación ni leer cookies. El SHA desplegado continúa sin revalidar.
- Inventario de navegadores aislados: vacío. Sin perfiles personales, arranque
  de Next/Prisma/Studio, build, lecturas de entorno, commit, push o despliegue.

### Pendiente desde este punto

1. Recuperar Git y revalidar cambios staged/no seguidos, remoto y despliegue de
   Preview antes de integrar o publicar la corrección local. Conservar los
   retoques previos de landing y manifiesto/lockfile.
2. En navegador aislado con acceso de prueba a Preview, completar la revisión
   **primero a 375 px**: landing/CTA/foto, home, cabecera/pie/blog, formulario,
   cierre, preferencias, diálogos y carrito. Después escritorio y panel ADMIN.
3. Ejecutar build con entorno local autorizado y protecciones comprobadas;
   preparar commit concreto y evidencias de Preview. No declarar completada la
   QA visual a partir de las 67 pruebas simuladas.
4. Tras la revisión, solicitar aprobación específica para la versión de
   Production. No está publicada esta corrección en ningún entorno remoto.

## Diagnóstico de la revisión visual real — 09/11/2026

Se ha intentado recuperar la revisión con Playwright 1.65.0 y Chromium ya
instalados **dentro del proyecto**, con perfil nuevo y sandbox de Chromium
activado. No se han descargado navegadores ni añadido dependencias.

El headless shell falla antes de renderizar incluso una página local mínima:
macOS indica `SystemAppearance not found`. Repetir con solicitud de ejecución
elevada tampoco resuelve el fallo. El Chromium completo tampoco consigue abrir
una página (`Target page, context or browser has been closed`, con `kill EPERM`
durante el cierre). No hay capturas ni QA visual acreditada.

El navegador integrado sigue sin instancias disponibles. Preview mantiene la
redirección 302 a autenticación de Vercel. Los guardas de base/servicios tampoco
validan el entorno heredado; no se ha arrancado Next ni cargado `.env*`.

La siguiente intervención debe habilitar un navegador aislado operativo y acceso
de prueba a Preview. No repetir instalaciones de Chromium ni ampliar permisos
de sistema sin diagnóstico. La configuración de permisos de comandos no activa
el navegador integrado, que tiene controles separados según la
[documentación oficial](https://learn.chatgpt.com/docs/permissions#scope-and-enforcement).
Tras resolverlo, ejecutar primero la matriz a 375 px y después escritorio.
Código, política local de permisos y despliegues permanecen sin cambios en
este intento; sigue vigente la corrección local y sus 67 pruebas anteriores.
