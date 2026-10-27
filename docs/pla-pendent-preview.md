# Pla de feina pendent de Preview

Plan inicial del 25/10/2026, con historial conservado debajo. **Estado actual y prioridades del 27/10:** [cierre-preview-2026-10-27.md](cierre-preview-2026-10-27.md). Newsletter, retenciones y Bre-B/importe ya comprobados; sesión PayPal completada, taller pendiente. URL: https://preview.energiaydivinidad.com. Trabajo solo en `preview`; producción requiere aprobar una versión concreta. El acceso de Vercel se mantiene.

| Ordre | Tasca | Execució i criteri de tancament | Dependència |
| --- | --- | --- | --- |
| 1 | Tancar l'API antiga de reserves | Completat a Preview f8672ed5: consulta amb sessió i propietat o ADMIN; creació antiga retirada. 401 anònim i 410 en el flux antic verificats remotament. | Revisar compatibilitat amb consumidors externs abans d'aprovar Production |
| 2 | Preus i newsletter de proves | Completada la preparació a Preview: mateixa projecció de preus que les fitxes, proves GROQ de format nou/antic i gratuïtat; newsletter sense compte de proves retorna 503 sense alta. Preus manipulats rebutjats amb 400 en ambdós mètodes. | Mailchimp separat per activar i provar els enviaments |
| 3 | Disponibilitat i concurrència de sessions | Implementat al codi: horari compartit de Colòmbia, durades, marges, festius, franges bloquejades, antelació i solapaments parcials. Reprogramació, crèdits, bescanvi de packs, entrega de sessions pagades i reactivació ADMIN comparteixen bloqueig transaccional. Prova amb Neon Preview: una guanyadora de dues peticions per a la mateixa franja; data inicial sense consumir canvis; dos canvis simultanis respecten el límit de dos. Desplegada a 287e38ff Ready; agenda remota contrastada amb l’ocupació real de Preview per a tres dates, amb durada de 90 minuts i noindex. Formulari privat sense sessió 401, data invàlida 400 i entrada antiga 410. Nova compra Bre-B simulada completada amb cita única del 2/11 a les 10:00 Colòmbia, durada 90 i sincronització Google registrada sense error. Rebut amb data i política comprovats a Proton. Resta vista externa del calendari i recorregut del client. | Implementació i proves específiques abans de proposar Production |
| 4 | Preparar continguts i administració de proves | Creats a Sanity 81jpalr2/preview un curs de text i un taller futurs amb «PRUEBA — NO REAL», sense reunions ni informació personal. Cap curs privat ni esdeveniment anterior substituït. Compte dedicat creat i verificat per Xavier; rol ADMIN assignat només a Neon Preview i accés a /admin/orders comprovat al navegador. | Completat per al compte ADMIN; fixtures sintètiques preparades |
| 5 | Completar la matriu de compres | Bre-B simulat: quatre tipus completats. PayPal: producte i curs completats amb el comprador dedicat, una entrega per ordre, captura i webhook correctes. Arxiu i lliçons comprovats amb CLIENT. Resten taller/sessió PayPal i comprovacions del QR i confirmació amb import de la versió nova. | Sessions web de prova i comprador sandbox dedicat; mai pagaments reals |
| 6 | Newsletter real de proves | Completar activació/accés de Mailchimp separat, verificar audiència pròpia, desar clau només a Preview i comprovar alta amb doble confirmació i baixa. | Compte Mailchimp separat; no reutilitzar l'audiència real |
| 7 | Revisió visual i legal | Recórrer compte, compra i panell amb sessió i en mòbil. Completar dades fiscals i adreça pública, condicions particulars, autoritzacions i terminis dels borradors. | Dades d'Aleyda i revisió dels textos |
| 8 | Preparació de publicació | Confirmar dades reals de Global66, repassar la versió concreta i conservar referència de retorn. | Aprovació explícita posterior; aquest pla no publica producció |

## Preparació concreta del compte ADMIN

Es proposa un compte nou i separat del client fictici, identificat com a administració de proves, només a Neon Preview. No s'eleva el rol del compte existent. Cap compte ni permís de Production es modifica. Tots els correus continuen limitats a aleydapaola@proton.me. La contrasenya la defineix l'usuari, fora del xat i del repositori.

Identitat proposada: «PRUEBA — ADMIN — NO REAL», correu de compte `aleydapaola+preview-admin@proton.me`, rol ADMIN exclusivament a la base de Preview. L'usuari fa l'alta i la verificació normals i introdueix la contrasenya; després de l'autorització es comprova que el compte és el nou de proves abans d'assignar-hi el rol. El reenviament de Preview continua portant els correus a l'únic destinatari autoritzat, `aleydapaola@proton.me`.

Xavier ha completat l’alta, verificació i inici de sessió del compte separat. Rol ADMIN assignat només a Preview amb registre d’auditoria; el client USER anterior es conserva. No s’han creat ni modificat contrasenyes des de l’agent. Accés al panell de vendes comprovat al navegador. Proton admet aquest àlies amb + sense configurar una bústia nova.

## Editor Sanity

El Studio continua accessible des de la URL tècnica de Preview ja autoritzada. Afegir CORS amb credencials per al subdomini continua pendent de l'aprovació concreta demanada anteriorment; no és necessari per navegar per la web ni per continuar les correccions de codi.

El registre anterior i la matriu detallada es conserven a [plan-preview-2026-10-25.md](plan-preview-2026-10-25.md) i [matriz-pruebas-preview.md](matriz-pruebas-preview.md).

## Resultat verificat d'aquesta primera fase

- Commit f8672ed5c44498e44170fa93225665be0d8825fa Ready a Vercel, desplegament dpl_BUYh1nkFpoF1ohHNNU7x9XxCfLyf. Equip, projecte, repositori i branca preview comprovats; el subdomini serveix aquest commit.
- 96 proves automàtiques, tipus i hooks de lint/format correctes. Respostes remotes: consulta anònima de reserves 401, creació antiga 410, newsletter no configurada 503, preus manipulats 400, confirmació de pagament sense sessió 401, curs privat i esdeveniment passat 400.
- Preview conserva redirecció de protecció 302 sense autenticar i noindex en les rutes comprovades. Production continua a 7b9a7ac3 i dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc.
- Cap compte o credencial nou, canvi de reserves, captura, transferència, devolució o enviament de correu en les proves d'aquesta fase. La disponibilitat al servidor i les entregues completes continuen pendents; no donar-les per validades a partir d'aquests resultats.

## Disponibilitat: límits de la verificació

La comprovació anterior a iniciar el pagament no és una retenció temporal de la franja. L’entrega torna a validar-la sota bloqueig: una altra compra pagada que hagi perdut la franja queda pendent de revisió, sense crear una cita duplicada ni donar-se falsament per entregada. Abans de publicar Production cal resoldre i provar aquest cas comercial (retenció amb caducitat o elecció posterior al pagament); no cobrar dues vegades ni canviar la data sense avisar. Les vies antigues WOMPI_MANUAL/Nequi queden fora de la matriu aprovada: WOMPI_MANUAL està bloquejat a Preview i l’entrada antiga /api/checkout/session es retira amb 410.

La prova de concurrència és sobre les dades de Neon Preview; no acredita sincronització remota simultània de Google Calendar ni entrega real de correus. S’han retirat només les reserves efímeres de la prova, preservant les reserves anteriors i els seus comptadors.

Fixtures de Sanity: `eyd-preview-course-checkout-test`, `eyd-preview-course-checkout-lesson`, `eyd-preview-event-checkout-test`. Slugs `prueba-curso-checkout` i `prueba-taller-checkout`; preus ficticis 80.000 COP / 20 USD. No traslladar-les a Production.

## Comprovació remota i matriu iniciada

- Preview 287e38ffaa738f3c19836f76c9f2dbeffb8e98d3 Ready, dpl_HTG9bHus7ffhAGxfwQhYQUYejnNN. Subdomini i URL tècnica assignats. 107 proves automàtiques en aquesta versió, tipus i hooks correctes.
- 19 pàgines comprovades: públiques 200, àrees privades 307 sense sessió, cap enllaç de navegació a Production. Curs i taller sintètics 200. Agenda remota concorda amb els intervals reals de Neon Preview en tres dates. Controls de preus 400, consulta privada 401, API antigues 410 i newsletter no configurada 503.
- Production continua a 7b9a7ac3, dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc.
- Quatre comandes Bre-B noves iniciades per a producte, curs, esdeveniment i sessió (2/11/2026, 10:00 Colòmbia), totes fictícies i inicialment PENDING, sense transferència. Les referències completes es conserven al registre privat de QA. Encara no equivalen a entrega.
- Revisió autenticada detecta que el botó de confirmació de la llista envia una referència buida; es prepara enllaç al formulari de detall existent, amb referència i verificació obligatòries. El formulari de les comandes simulades de Preview indica explícitament que no hi ha diners reals. 108 proves; d41e1e81 Ready a dpl_2ZjETqQbX67KdPFoY9taLFNFiPNe i subdomini comprovat. Les quatre confirmacions s’han fet des d’aquest formulari autenticat.

## Resultat Bre-B i comprador PayPal dedicat

- Les quatre comandes Bre-B del producte, curs, taller i sessió han passat a COMPLETED mitjançant el panell ADMIN real de Preview. Producte i curs: un entitlement per ordre. Taller: una reserva CONFIRMED i un entitlement EVENT. Sessió: una reserva CONFIRMED de 90 minuts, 2/11/2026 15:00Z, comptador zero i ID de Google amb sincronització correcta. Una auditoria MANUAL_PAYMENT_CONFIRMATION per ordre. No s’ha transferit ni rebut diners reals.
- Confirmacions i avisos de venda rebuts a aleydapaola@proton.me amb [PREVIEW]. Comprovades la referència exacta del producte, l’enllaç a /mi-cuenta/compras de Preview i la referència exacta de la sessió, 10:00 Colòmbia, i la política acordada. Evidència de recepció a Proton; no s’ha consultat el registre Delivered de Resend.
- PayPal Developer verificat al tauler d’Aleyda Vargas Galvis. El comprador Personal anterior és el mateix que Xavier identifica com a utilitzat a Amor Sanación Alquimia. Amb autorització específica s’ha creat un comprador nou Personal CO exclusiu d’EYD, confirmació de creació correcta i tres comptes visibles. Identificador i referència d’usuari conservats al registre privat de QA; contrasenya no llegida ni copiada al xat/repo. Pendent que Xavier iniciï la sessió sandbox d’aquest comprador amb les credencials generades per PayPal. No s’han activat plans ni subscripcions.
- Curs sintètic separat per a PayPal: eyd-preview-course-paypal-checkout-test, slug prueba-curso-paypal-checkout, mateixa lecció fictícia i 80.000 COP/20 USD. Permet provar una compra nova després de la prova Bre-B, sense confondre-la amb l’accés ja adquirit al primer curs. Les comandes de preparació PayPal encara no estan capturades; no considerar la matriu de vuit compres completada.
- Correcció visual addicional desplegada a 37c7a828: llista i fitxa de productes digitals usen pricingProjection, com el checkout, amb prova GROQ que contrasta preus nous/antics contra els realment mostrats. Dates de vendes amb fus de Colòmbia i referència de comanda llegible. 109 proves correctes i tipus correctes.

## PayPal: primera compra completa i verificació actual

- 37c7a8282df5bc3e63e5b4c4b83c1c62b03d66c6 Ready a dpl_929SuMgCMjdNH11yXBxXQVSvLC6H. Verificats projecte, repositori aleydapaola/energia-y-divinidad, branca preview i ambdós àlies. Production continua a 7b9a7ac3 i dpl_4Kwyq1ERrbCFxuhYxpJBTxC7rDbc.
- Xavier ha guardat les credencials i iniciat la sessió del nou comprador Personal sandbox dedicat. Compra de producte iniciada i completada al navegador, 20 USD ficticis, retorn a la confirmació de Preview amb estat d’èxit. Neon confirma COMPLETED, un entitlement, pagador igual al comprador dedicat i captura COMPLETED. Webhook PAYMENT.CAPTURE.COMPLETED registrat amb processed=true, failed=false i retryCount=0. Referència exacta al registre privat de QA. No equival a verificar encara la descàrrega amb el client ni la recepció d’aquest correu PayPal.
- El compte web ADMIN (+preview-admin) ja està validat. Per provar propietat, descàrregues, lliçons i carret del curs cal el compte web CLIENT aleydapaola@proton.me, que conserva rol USER i les compres fictícies. Sol·licitada recuperació des del formulari de Preview; el navegador mostra confirmació i caducitat d’una hora. Xavier ha de definir i enviar personalment la contrasenya i iniciar la sessió; l’agent no modifica credencials ni eleva el client a ADMIN.

## Accés CLIENT i segona compra PayPal

- Xavier confirma inici de sessió amb el CLIENT. Mis Compras mostra les ordres completades; el producte obre el TXT sintètic del dataset preview i el curs Bre-B permet llegir la lliçó protegida. Mis Eventos mostra una sola reserva del taller i Mis Sesiones la nova cita del 2/11 a les 10:00 Colòmbia/16:00 Madrid, 90 minuts i política acordada. Reserva anterior amb dos canvis intacta; formulari de reprogramació obert i tancat sense guardar.
- Compra nova del curs PayPal feta des del carret web autenticat, 20 USD ficticis, amb el comprador sandbox dedicat. Retorn satisfactori a Preview i lliçó llegible des de Mis Cursos. Neon confirma compte USER correcte, una entrega COURSE, captura COMPLETED i webhook processat sense errors ni reintents. Resten taller i sessió PayPal, correus nous i revisió externa del calendari.
- La revisió de Mis Eventos ha detectat hora UTC sense etiqueta. Es prepara format compartit amb America/Bogota i etiqueta «hora de Colombia, UTC−5» per a fitxes, compte, llista d'espera i correus d'esdeveniments. No es modifica cap instant ni reserva. 111 proves correctes i tipus correctes; falta desplegar i contrastar la vista remota.

## Reanudación — 27/10/2026

Preview 0d3f09a7 Ready y Production preservada. Acceso CLIENT recuperado con el guardado del navegador. Hora de la ficha del taller corregida y comprobada, pero el checkout aún mostraba hora del navegador y no utilizaba approvalUrl de PayPal: se corrigen ambos antes de la compra pendiente.

Se corrige también el cupo: la inscripción Bre-B existente no descontaba plazas. Fuente compartida Prisma con asignaciones y reservas históricas sin duplicar ni reescribirlas; descuento real en ficha/listado/API. Entrega de evento atómica con asignación y acceso, validación anterior al pago y bloqueo compartido entre vías que asignan plazas. 123 pruebas, tipos y lint sin errores. Concurrencia real en Neon Preview y rollback de los tres recursos correctos; fixtures efímeras retiradas. Falta desplegar y repetir la compra real sandbox. Esta corrección no mantiene una plaza retenida durante la aprobación del pago; esa decisión operativa sigue pendiente antes de Production.

Evidencia externa del 25/10: Calendar de Aleyda mostraba una única cita de pruebas el 2/11, 10:00–11:30, en PRUEBAS — NO REAL — Energía y Divinidad. Recibo PayPal del curso recibido en Proton con referencia exacta y enlace a Mis Cursos. No confundir esta comprobación con pruebas de envío a clientes ni con estado Delivered de Resend.

### Resultado remoto y siguiente intervención del usuario

- 54b12d781e5c7bb05132eb1ed5960885b7903b42 Ready en dpl_4rxuk5nMyfb1RfGbWA1Fjit9n93m. Repositorio, proyecto, rama y ambos alias correctos. Migraciones sin pendientes. API del taller devuelve 20 plazas totales y 19 disponibles; descuenta la reserva Bre-B histórica sin reescribirla.
- Nuevo pedido Bre-B sintético iniciado en navegador: QR falso visible, destinatario/llave ficticios y 80.000 COP. Aviso con referencia ficticia registrado; UI y Neon mantienen PENDING y cero entitlements para esa orden. Ruta QR sin sesión/cookie propietaria 404. Falta la confirmación ADMIN con importe recibido. Referencias exactas en registro privado de QA.
- Sesión PayPal preparada para 2/11/2026 a las 14:00 Colombia, 90 minutos y 100 USD ficticios; comprador sandbox dedicado verificado. La revisión automática rechaza el clic final incluso en sandbox y exige intervención personal del usuario. Estado comprobado PENDING; no repetir por API ni otra vía. Solicitado que Xavier pulse Completar compra y avise al volver a Preview. Taller PayPal todavía pendiente.
- Xavier confirma que Mailchimp separado no está activado y consulta si debe crear una cuenta. Se explica cuenta normal Free exclusiva de pruebas con aleydapaola@proton.me y nombre PRUEBAS — NO REAL — Energía y Divinidad; registro/contraseña/activación por el usuario. Si hay correo de activación previo, completar ese registro. No se ha activado Mailchimp, creado clave ni añadido contactos reales.

### Mailchimp en alta y código preparado

Xavier facilita la sesión de alta us2. El perfil pasa a dirección postal; se solicita completar los datos directamente en Mailchimp, con dirección autorizada para el pie de los correos y plan Free. Identidad y audiencia aún por verificar. Metadatos de Vercel confirman que la clave real conserva Production/Development y no está en Preview; no se cambian ámbitos ni valores.

Se corrige la preparación de la API: autenticación Basic, validación de email y respuesta según estado del contacto. Una baja no se convierte en alta; se ofrece el formulario alojado de confirmación. Se conserva el destinatario único de Preview y el bloqueo sin audiencia propia. 128 pruebas correctas, tipos y lint correctos, sin contactos ni envíos externos. Plan detallado en [newsletter-preview.md](newsletter-preview.md). La conexión y pruebas reales continúan pendientes de terminar el alta.

### Mailchimp conectado: confirmación humana pendiente

Cuenta Free separada verificada como preview-newsletter@energiaydivinidad.com. Audiencia 2263470886/us2 renombrada PRUEBAS — NO REAL — Energía y Divinidad y Double opt-in guardado. Clave generada personalmente por Xavier tras el rechazo automático al clic del agente; Secret nuevo y variables de audiencia/región exclusivos de la rama preview. Clave original Production/Development y audiencia real preservadas.

a7afb01e Ready con la configuración nueva en dpl_CyT2PgQqjBFvRKQ9Gkzh6dJx9qEG; ambos alias y origen verificados. Alta enviada desde la portada, confirmación recibida en Proton y repetición 200/pending comprobada. El enlace lleva a Confirm Humanity/reCAPTCHA de Mailchimp: Xavier debe completarlo y pulsar Subscribe. Después restan comprobar subscribed, baja y nueva solicitud tras la baja. No hay campañas enviadas ni pruebas de newsletter completas todavía. Production sigue en 7b9a7ac3. Los pendientes anteriores de PayPal, confirmación ADMIN con importe, retención de plazas/horas, revisión móvil y datos legales se mantienen.

Resultado tras intervención de Xavier: **newsletter de Preview comprobada**. CAPTCHA y Subscribe completados por el usuario; página oficial confirma el alta y API devuelve 200/subscribed. Correo de preferencias recibido en Proton, baja efectuada desde el formulario del suscriptor y confirmación Unsubscribe Successful. Repetir alta devuelve 409 y la web ofrece Volver a suscribirme sin reactivar al contacto. Contacto de QA dejado de baja. Sin campañas ni contactos de Production modificados. El resto de pendientes anteriores se mantiene.
