# Registro y newsletter — preparación y verificaciones

## Estado observado al retomar — 05/11/2026

Vercel sirve ya `8c5290cd18e4281854bf9dac60c42c420a465b6d` en Production,
despliegue `dpl_AjzQnWKeGXmJaaKcW8S1H7DWhQsG`, Ready. Ambos dominios reales
apuntan a ese despliegue. Preview conserva el mismo código en
`dpl_FX6J893gThW31LujxrBppcq735mZ`, Ready. Consultados equipo, proyecto,
repositorio y referencias remotas: `main` y `preview` coinciden con ese SHA.
Los apartados posteriores conservan el seguimiento histórico de preparación;
su indicación de publicación pendiente ya no describe el estado servido.

Comprobación de solo lectura: portada, registro, acceso, términos, privacidad y
regalo HTTP 200; aceptación única obligatoria sin marcar, aviso de baja y Turnstile
presentes; diagnósticos ADMIN anónimos HTTP 401. Audio con MIME correcto,
9.263.703 bytes y petición parcial HTTP 206. Metadatos de las cuatro variables
de protección Production coinciden con la configuración registrada el 04/11;
no se leen secretos ni se modifican ámbitos o despliegues en esta revisión.

Formulario Preview revisado visualmente con emulación iPhone SE 375 × 667:
campos, textos de comunidad/aceptación, enlaces y botón legibles. Turnstile
muestra éxito automático. No se marca la aceptación, no se envía el formulario
ni se repite la prueba personal anterior. No equivale a una prueba en un teléfono
físico ni a una nueva alta completa en Production.

Evidencias nuevas de despliegue y HTTP, sin secretos ni contactos:
`.local-private/registration-production-2026-11-04/resume-deployment-proof-2026-11-05.json`
y `resume-http-proof-2026-11-05.json` del mismo directorio.

## Una suscripción por dirección — requisito confirmado 05/11/2026

Xavier pide expresamente evitar duplicados tanto al suscribirse primero a la
newsletter y crear después una cuenta como en el orden inverso. La identidad
compartida es la misma dirección normalizada (espacios exteriores y mayúsculas),
en la misma audiencia del entorno. No se unifican direcciones diferentes ni se
deduce que dos buzones pertenezcan a una persona.

El código existente ya consulta el contacto por hash de email. Un contacto
suscrito se reutiliza; el formulario independiente reconoce «Member Exists» y
no modifica su estado. La entrega del regalo usa la misma clave por audiencia,
email y versión en ambos recorridos, con bloqueo transaccional. Una baja anterior
no se reactiva al crear la cuenta y mantiene disponible el formulario oficial
de reinscripción.

Añadidas cinco pruebas cruzadas en `tests/newsletter-gift.test.mjs`, ejecutando
el handler de newsletter, el procesador de registro y el servicio de regalo
reales con base/proveedor/correo simulados: newsletter→cuenta, cuenta→newsletter,
newsletter pendiente→cuenta verificada, solicitudes simultáneas y baja previa.
Se verifica un contacto, un regalo, ausencia de reactivación y normalización del
email en el modo Production simulado, sin sustitución de destinatario Preview.
Las 41 pruebas relacionadas pasan. No hay cambios de lógica de aplicación,
migraciones, campañas, contactos reales ni envíos; no se necesita un despliegue
nuevo para este refuerzo de pruebas.

## Preparación histórica — 03–04/11/2026

Última instrucción expresa de Xavier (04/11/2026): adaptar el ejemplo facilitado
con una única casilla obligatoria, sin marcar, que mencione términos, privacidad
y newsletter. Se explica antes la comunidad, el regalo y el uso de los datos.
Solo aparece «Crear cuenta y suscribirme». Esta decisión sustituye las variantes
anteriores de dos casillas, newsletter premarcada y cuenta sin newsletter.

Toda modificación debe funcionar y verificarse primero en Preview. La aprobación
del comportamiento de pruebas no autoriza publicar una versión en Production.

## Comportamiento preparado

- La API exige newsletterOptIn=true y newsletterConsentAction=subscribe, además de
  términos aceptados y Turnstile válido. Valores ausentes, falsos o incoherentes
  se rechazan antes de crear cuentas o enviar correos. La aceptación única no se
  premarca y autoriza ambos valores desde una acción expresa del formulario.
- Se guarda fecha, origen, versión v5 y texto que identifica que el registro incluye
  newsletter y el botón elegido. La casilla explica «He leído y acepto los Términos
  y Condiciones y la Política de Privacidad de Energía y Divinidad, y acepto
  suscribirme a su newsletter». Se informa del enlace de baja de cada newsletter.
  Los consentimientos v1/v2/v3/v4 guardados se conservan
  y siguen siendo procesables. No hay nueva migración ni cambio de cuentas antiguas.
- La newsletter se activa solo después de verificar el email de la cuenta. No se
  envía otro correo para confirmar Mailchimp. La bienvenida y el regalo conservan
  diseño y logo; el regalo se entrega una sola vez por audiencia, email y versión.
- Las bajas anteriores se conservan. Las direcciones inactivas requieren el
  formulario oficial de reinscripción; los reintentos no anulan bajas posteriores.
- Cada newsletter debe incluir un enlace visible «Darme de baja». Mailchimp utiliza
  su enlace UNSUB en las campañas; la plantilla de bienvenida lo incluye. El regalo
  de Resend incluye enlace real en HTML/texto y cabecera List-Unsubscribe. El renderer
  rechaza URLs ausentes, ajenas al proveedor o sin los parámetros de la audiencia.
- Una baja detiene las newsletters y conserva cuenta y compras. No cambia correos
  necesarios para verificar la cuenta, gestionar compras, reservas o membresías.
- Los errores de alta/entrega se conservan para reintentar. Cron diario existente:
  hasta tres solicitudes por lote. ADMIN Comunicaciones permite revisar pendientes
  sin procesar campañas. Preview no ejecuta automáticamente los cron de Production.
  Envíos inciertos antiguos de Resend conservan revisión manual antes de repetirse.
- REGISTRATION_NEWSLETTER_ENABLED=false pausa nuevas altas de este formulario y
  procesamiento de newsletter, sin borrar cuentas, consentimientos ni contactos.

## Protección y aislamiento

Turnstile Free administrado, sin pre-clearance ni cambios de DNS. Widget propio
«EYD Preview — Registro y newsletter», cuenta contacto@energiaydivinidad.com,
limitado al dominio personalizado y alias técnico de Preview verificados.

TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, AUTH_RATE_LIMIT_SECRET y
REGISTRATION_NEWSLETTER_ENABLED exclusivamente Preview/gitBranch preview. Valores
fuera de Git/informes. Production rechaza claves Turnstile dummy; el perfil local
solo admite esas claves de prueba y bloquea credenciales externas reales.

Registro/reenvío: validación de token, dominio y acción, campo trampa y cinco
solicitudes/IP/15 minutos por ruta. Correos de verificación: límite compartido de
uno/minuto y tres/hora por email. Verificación: 30/IP/15 minutos. Newsletter
independiente: cinco/IP/15 minutos y tres/email/hora, conservando su doble opt-in.
Contadores atómicos Neon con identificadores HMAC, sin emails/IP en claro; limpieza
diaria de caducados. Fallos de protección bloquean el envío y permiten reintentar.

Migración 20261103070000_registration_newsletter aplicada solo a Neon Preview.
No se han modificado pagos, campañas, condiciones de compra ni datos de Production.

## Pruebas y punto de continuación

- 236 pruebas previas correctas; 36 pruebas relacionadas repetidas tras cambiar a
  aceptación única, todas correctas. Cubren rechazo del alta sin newsletter,
  casilla única sin marcar/obligatoria, enlace de baja obligatorio, versiones
  antiguas, concurrencia y reintentos. Tipos correctos y hooks lint/formato sin errores.
- Neon Preview real: 12 peticiones concurrentes, cinco permitidas y siete bloqueadas;
  ocho intentos de obtener el trabajo, una concesión. Sin proveedores/correos y
  fixtures propias retiradas. No repetir esas pruebas salvo cambios que las afecten.
- Versión final 8c5290cd18e4281854bf9dac60c42c420a465b6d Ready en Preview
  dpl_7WzcVRkZbr1qAnoQdZh9ww35du1n. API Vercel coteja equipo, proyecto,
  repositorio, ref preview, SHA y los dos alias; Production conserva su despliegue.
- HTTP real final: signup, términos, privacidad y verificación 200; una única
  casilla obligatoria sin marcar y botón explícito presentes. ADMIN anónimo 401;
  registro sin token Turnstile o sin newsletter 400. No se crea cuenta ni envía
  correo en estas comprobaciones. Privacidad explica la aceptación combinada.
- Brave carga el formulario final: comunidad, regalo, responsable, enlaces,
  casilla única con valor 0 y botón desactivado. Turnstile carga y muestra éxito
  automático, sin resolver un desafío ni enviar el formulario. Se preserva la
  pestaña anterior. Revisión visual de escritorio completada: textos legibles y
  sin recortes en el bloque de comunidad, datos y aceptación. No se ha hecho una
  prueba en navegador móvil. No se ha introducido ni cambiado una contraseña por
  el agente.
- Production verificada el 04/11/2026: 649e5c2a/dpl_GGDMGfFcFdUhQtiodDGFSZk2J7yu;
  metadatos de variables idénticos a la referencia previa.
- Xavier autoriza temporalmente aleydapaola+registro20261103@proton.me para un alta
  nueva. PREVIEW_EMAIL_RECIPIENT tiene una excepción sensible solo en preview; el
  Secret original se conserva. Xavier completa personalmente el alta y la
  verificación el 04/11/2026. Neon confirma cuenta verificada, consentimiento v5,
  activación en un intento y un único EmailLog del regalo SENT.
- Recepción real del nuevo regalo comprobada en Proton: destinatario exacto del
  alias, remitente EYD, enlace al reproductor de Preview y «Darme de baja» visible.
  La conversación incluye también el regalo anterior; no son dos envíos al alias.
- Baja real del alias nuevo realizada mediante ese enlace, audiencia QA 2263470886.
  Mailchimp confirma «Unsubscribe Successful» y que dejará de recibir marketing.
  No se solicita reinscripción ni se altera el contacto QA anterior. Neon conserva
  la cuenta verificada y un único regalo. ACTIVE en RegistrationNewsletter refleja
  la activación realizada; no es una consulta del estado actual de Mailchimp tras
  la baja. La newsletter y sus futuras campañas respetan la baja del proveedor.
- Restaurado en Vercel el destinatario habitual aleydapaola@proton.me únicamente
  Preview/gitBranch preview. Reconstrucción del mismo SHA 8c5290cd Ready:
  dpl_FX6J893gThW31LujxrBppcq735mZ. Fuente, proyecto/equipo/repositorio y ambos
  alias verificados por API; HTTP final correcto tras la restauración. Production
  y sus metadatos de variables permanecen intactos.
- Cerrada la prueba completa de Preview. La cuenta del alias se conserva verificada
  y dada de baja de marketing: no volver a suscribirla ni reenviarle el regalo.
  Production no está autorizada para esta nueva funcionalidad: requiere aprobación
  expresa de la versión y preparación de Turnstile/configuración propios.
- La obligatoriedad del marketing puede afectar a la validez del consentimiento
  cuando se aplica el RGPD y la publicidad no es necesaria para el servicio. Se ha
  advertido expresamente a Xavier; esta preparación de Preview no acredita validez
  jurídica ni sustituye la revisión de esta condición antes de Production.

Evidencias privadas: .local-private/registration-newsletter-2026-11-03/.
