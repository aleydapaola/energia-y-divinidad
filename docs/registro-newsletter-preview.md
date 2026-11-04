# Registro y newsletter — Preview, 03/11/2026

Plan actualizado por Xavier el 04/11/2026: casilla opcional marcada por defecto con novedades y regalo;
activar la newsletter solo al verificar la cuenta, sin una segunda confirmación.
Toda modificación debe funcionar y verificarse primero en Preview. Esta
aprobación no autoriza publicar en Production.

## Comportamiento

- La casilla aparece marcada por petición expresa del 04/11/2026. El botón principal
  indica «Crear cuenta y suscribirme»; desmarcarla muestra «Crear cuenta» y también
  existe el botón visible «Crear cuenta sin newsletter» mientras está marcada.
- La autorización se recoge mediante la acción expresa del botón de suscripción,
  no por la selección inicial. El registro exige newsletterOptIn=true y
  newsletterConsentAction=subscribe para guardar consentimiento. Sin esa acción
  coherente no crea el alta de newsletter. La aceptación de términos sigue desmarcada.
- Consentimiento v2: guarda texto de newsletter y la acción «Crear cuenta y
  suscribirme». La versión v1 anterior sigue siendo procesable para no invalidar
  autorizaciones guardadas. No requiere otra migración ni un correo adicional.
- La verificación consume el token y habilita el trabajo pendiente de forma
  transaccional. El envío de bienvenida y la newsletter no impiden activar la cuenta.
- Mailchimp sigue gestionando el estado real. Un alta nueva verificada se crea como
  subscribed; un contacto pending puede activarse con esta nueva autorización.
  Unsubscribed, cleaned y otros estados inactivos requieren reinscripción externa.
- El regalo reutiliza Resend, el mismo diseño/logo y la clave de deduplicación por
  audiencia, email y versión de regalo. La entrada interna exige consentimiento
  registrado y cuenta verificada; el webhook mantiene firma y validación originales.
- Los errores quedan pendientes de reintento. El cron diario existente revisa hasta
  tres solicitudes, y ADMIN Comunicaciones permite repetir la revisión. Respuestas
  inciertas antiguas de Resend conservan el estado de revisión manual; no se repiten
  fuera de la ventana de deduplicación. Preview no ejecuta cron automáticamente:
  utilizar el control ADMIN para comprobar recuperación sin procesar campañas.
- La integración puede pausarse con REGISTRATION_NEWSLETTER_ENABLED=false. No borra
  consentimientos ni contactos; se conserva la referencia del despliegue anterior.

## Protección y configuración

Turnstile Free administrado, sin pre-clearance ni cambios de DNS. Widget propio
«EYD Preview — Registro y newsletter», cuenta contacto@energiaydivinidad.com.
Solo admite preview.energiaydivinidad.com y el alias Git Preview verificado.

Variables nuevas exclusivamente Preview/gitBranch preview:
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, AUTH_RATE_LIMIT_SECRET y
REGISTRATION_NEWSLETTER_ENABLED. Secretos fuera de Git e informes. Production
no admite claves oficiales dummy. El perfil local acepta únicamente claves
Turnstile dummy, conservando el bloqueo de credenciales externas reales.

Registro y reenvío: Turnstile validado en servidor (dominio y acción), campo trampa,
cinco solicitudes/IP/15 minutos por ruta. Correos de verificación: límite compartido
de uno/minuto y tres/hora por email. Verificación: 30/IP/15 minutos. Newsletter
independiente: cinco/IP/15 minutos y tres/email/hora, manteniendo doble opt-in.
Contadores atómicos en Neon, identificadores HMAC, sin emails/IP en claro; retirada
diaria de contadores caducados. Un fallo de protección bloquea el envío con opción
de reintentar conservando los campos. No se garantiza eliminar todo el abuso.

Migración aditiva: 20261103070000_registration_newsletter; tablas nuevas de
consentimiento/trabajo y contadores. Aplicada solo a Neon Preview verificada.
No migra usuarios anteriores ni cambia permisos de marketing de otros sistemas.

## Verificaciones y estado

- Suite automática: 235 pruebas, tipos correctos y lint sin errores (avisos
  documentados en los archivos existentes y expresiones de estados).
- Prueba real en Neon Preview: 12 peticiones concurrentes, cinco admitidas y siete
  rechazadas; ocho reclamaciones del mismo trabajo, una única concesión. Sin llamadas
  de correo/proveedores y fixtures propias retiradas.
- Xavier autoriza temporalmente aleydapaola+registro20261103@proton.me para una
  nueva alta de pruebas. Restaurar aleydapaola@proton.me al finalizar, reconstruir
  Preview y cotejar el ámbito; conservar cuenta, reservas y regalo QA anteriores.
- Preview publicada: c7dd90db68941dc9f4b1584f14dddff22226c18b,
  dpl_BjYvSHLupgh3TjCDWK5Rawg8zKb9 Ready. Ambos alias de Preview cotejados;
  migraciones y compilación correctas. Comprobación repetida el 04/11/2026.
- HTTP real con acceso de automatización existente, sin desactivar protección:
  registro y privacidad 200, casilla opcional desmarcada y texto nuevo presentes,
  registro sin Turnstile 400 y diagnóstico ADMIN anónimo 401. No se crearon cuentas
  ni enviaron mensajes en esas comprobaciones.
- Navegador ADMIN de pruebas: integración de newsletter ready=true, controles
  originales de audiencia/webhook correctos; bloque de solicitudes y reintentos
  visible con integración y protección configuradas. No se pulsaron envíos ni colas.
- Production cotejada de nuevo el 04/11/2026: dpl_GGDMGfFcFdUhQtiodDGFSZk2J7yu,
  649e5c2a; metadatos de las variables Production idénticos a la referencia previa.
- Pendiente una nueva alta real de pruebas: el alias todavía no tiene cuenta,
  consentimiento ni regalo registrado en la consulta del 04/11/2026. Se ha pedido
  al usuario introducir personalmente la contraseña de pruebas, crear la cuenta
  marcando la newsletter y abrir el enlace recibido. No dar ese recorrido por
  validado antes de comprobarlo.
- La excepción temporal PREVIEW_EMAIL_RECIPIENT de la rama preview sigue apuntando
  al alias autorizado para completar esa prueba; el Secret original se conserva
  sin leer ni sustituir. Tras comprobar suscripción y regalo, restaurar el destino
  habitual, reconstruir Preview y verificar Ready/alias antes de cerrar el trabajo.
  La publicación en Production sigue sin estar autorizada.

Evidencias operativas privadas en .local-private/registration-newsletter-2026-11-03/.
No ejecutar compras, campañas, cancelaciones ni devoluciones para esta verificación.


## Ajuste de selección inicial — 04/11/2026

Petición explícita de Xavier: seleccionar inicialmente la newsletter y permitir
desmarcarla. Preparado en Preview con acción de suscripción identificada en el botón
y alternativa de cuenta sola; API comprueba la elección y registra v2. Pruebas
específicas comprueban los tres envíos de formulario, rechazo de elecciones
incoherentes, términos sin premarcar y compatibilidad v1. Falta verificar el
despliegue de este ajuste antes de completar el alta personal del alias autorizado.
