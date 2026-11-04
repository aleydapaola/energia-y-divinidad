# Registro y newsletter — Preview, 03–04/11/2026

Última instrucción expresa de Xavier (04/11/2026): este formulario de alta exige
aceptar la newsletter. La casilla aparece marcada y, al desmarcarla, no permite
crear la cuenta. Solo aparece «Crear cuenta y suscribirme». Esta decisión sustituye
las variantes anteriores de casilla opcional y botón de cuenta sin newsletter.

Toda modificación debe funcionar y verificarse primero en Preview. La aprobación
del comportamiento de pruebas no autoriza publicar una versión en Production.

## Comportamiento preparado

- La API exige newsletterOptIn=true y newsletterConsentAction=subscribe, además de
  términos aceptados y Turnstile válido. Valores ausentes, falsos o incoherentes
  se rechazan antes de crear cuentas o enviar correos. Los términos no se premarcan.
- Se guarda fecha, origen, versión v3 y texto que identifica que el registro incluye
  newsletter y el botón elegido. Los consentimientos v1/v2 guardados se conservan
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

- 236 pruebas correctas; tipos correctos; lint sin errores, con avisos previos.
  Cubren rechazo del alta sin newsletter, formulario marcado/obligatorio, términos
  desmarcados, enlace de baja obligatorio, versiones antiguas, concurrencia y reintentos.
- Neon Preview real: 12 peticiones concurrentes, cinco permitidas y siete bloqueadas;
  ocho intentos de obtener el trabajo, una concesión. Sin proveedores/correos y
  fixtures propias retiradas. No repetir esas pruebas salvo cambios que las afecten.
- Última versión remota verificada antes de este ajuste: c7dd90db, Preview
  dpl_BjYvSHLupgh3TjCDWK5Rawg8zKb9 Ready. Ambos alias, HTTP y ADMIN health cotejados.
  Esa versión todavía presenta el alta opcional y no acredita el ajuste obligatorio.
- Production verificada el 04/11/2026: 649e5c2a/dpl_GGDMGfFcFdUhQtiodDGFSZk2J7yu;
  metadatos de variables idénticos a la referencia previa.
- Xavier autoriza temporalmente aleydapaola+registro20261103@proton.me para un alta
  nueva. PREVIEW_EMAIL_RECIPIENT tiene una excepción sensible solo en preview; el
  Secret original se conserva. La cuenta del alias aún no existía en la última
  consulta. El usuario debe introducir personalmente contraseña y verificar el email.
- Pendientes: Ready/SHA/alias del ajuste obligatorio, comprobación visual/HTTP y
  prueba personal completa de alta, suscripción, regalo y baja. Después restaurar
  aleydapaola@proton.me como destinatario habitual, reconstruir y verificar Preview.
- La obligatoriedad del marketing puede afectar a la validez del consentimiento
  cuando se aplica el RGPD y la publicidad no es necesaria para el servicio. Se ha
  advertido expresamente a Xavier; esta preparación de Preview no acredita validez
  jurídica ni sustituye la revisión de esta condición antes de Production.

Evidencias privadas: .local-private/registration-newsletter-2026-11-03/.
