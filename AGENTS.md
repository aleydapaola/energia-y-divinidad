# Flux de desenvolupament i publicació

## Regles permanents per als agents

- Fer els canvis d'aplicació a `preview` o en una branca de treball que parteixi de la base verificada de preview. Abans d'editar, comprovar la branca i els canvis pendents.
- Reservar `main` per al codi aprovat de producció. Cal l'aprovació explícita de l'usuari sobre la versió concreta abans d'integrar o publicar a producció. Una petició de canvi ordinària autoritza preparar i provar la preview, però no publicar a producció.
- Facilitar l'enllaç de preview i explicar quines comprovacions s'han fet i quines funcionalitats no s'han pogut provar abans de demanar l'aprovació.
- Verificar a Vercel el projecte, equip, domini, repositori i commit publicat. No assumir que `main` local o remota equival al desplegament que serveix actualment el domini.
- No barrejar codi, repositoris, equips ni credencials d'Amor Sanación Alquimia i Energía y Divinidad. No connectar ni transferir projectes entre propietaris sense una petició explícita.
- Preservar els canvis pendents i les versions anteriors abans de sincronitzar branques. No fer `reset --hard`, neteges destructives ni pushes forçats sense necessitat justificada i autorització.
- La preview ha de tenir base de dades i pagaments de prova. No reutilitzar la base de dades de producció, executar-hi migracions des de preview ni fer cobraments reals durant les proves.
- Comprovar els correus, llistes de contactes, webhooks i serveis externs de preview: les proves no han d'enviar missatges a clients ni modificar contactes de producció.
- Mantenir les credencials fora del repositori i dels informes. Revisar-ne els àmbits sense revelar-ne els valors.
- En publicar una versió aprovada, comprovar que el codi d'aplicació correspon al revisat a preview, validar el desplegament i conservar una referència per tornar a la versió anterior.

## Identitat i punt de partida verificat (2026-10-17)

- Propietària indicada per l'usuari: Aleyda.
- Repositori: `https://github.com/aleydapaola/energia-y-divinidad.git`.
- Vinculació local de Vercel: projecte `prj_unjgBqGNUdLMP4TtRdvBMqKgxmcV`, equip `team_1whYgceEyjMN8Ni9tLEOWbNx`.
- Equip de Vercel verificat al tauler: `aleyda-paola-vargas-projects`; projecte `energia-y-divinidad`.
- Domini de producció verificat: `www.energiaydivinidad.com` (enllaç al domini `energiaydivinidad.com`).
- Commit de producció observat al tauler: `7b9a7ac3f8ee65ea6f7e80a9cc7460a62c0c17cd`, desplegament `4Kwyq1ERrbCFxuhYxpJBTxC7rDbc`.
- Branca local inicial de preview: `preview`, creada des d'aquest mateix commit.
- Referència local recuperable: `baseline-production-2026-10-17`.
- Les branques locals `main`, `dev` i `production-email-verification-fix` es conserven sense substituir-ne l'historial. La branca local `main` divergeix de la producció verificada; no utilitzar-la com a base de publicació sense reconciliar-la explícitament.
- La branca Git `preview` s'ha publicat a GitHub des del mateix commit de producció, sense modificar el codi d'aplicació.
- Neon verificat: projecte `long-shadow-80749091`, branca de producció `br-steep-moon-agritl58`.
- Nova base de proves: branca Neon `preview` (`br-floral-violet-agbqeqgy`), creada només amb esquema i sense copiar dades d'usuaris. S'hi han registrat les sis migracions aplicades correctament a producció, comprovant noms i checksums contra el repositori i les metadades originals. Comprovació: 6 migracions aplicades i 0 usuaris.
- Vercel `DATABASE_URL`: la connexió original conserva els àmbits Production i Development; la connexió nova de Neon està desada com a Secret amb àmbit exclusiu Preview. No copiar la connexió original a preview ni executar el servidor local amb la configuració de producció. La configuració local de desenvolupament encara s'ha de separar abans de fer-hi proves amb escriptura.
- Claus de serveis reals retirades de l'àmbit Preview, conservant la resta d'àmbits originals: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `MAILCHIMP_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`, `PAYPAL_CLIENT_SECRET`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`.
- Les proves de pagament, correu, calendari i edició de continguts queden pendents de credencials/serveis de prova separats. No considerar-les validades per haver desplegat la preview visual.
- Preview té `NEXTAUTH_URL` = `https://energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app`, `PAYPAL_ENVIRONMENT=sandbox` i `WOMPI_ENVIRONMENT=sandbox`; els valors originals conserven la resta d'àmbits.
- La variable antiga `NEXT_PUBLIC_APP_URL` es conserva com a Secret amb àmbit Production and Preview. S'ha creat i verificat una excepció Config per a la branca Git `preview`, amb el valor `https://energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app`. El pas intermedi autoritzat a `dev` s'ha traslladat a `preview`; la variable nova ja no està assignada a `dev`. No substituir ni eliminar el valor original de producció.
- La primera compilació Preview (`EmGbmTvVebSxbzrpNQwMGsn7rSfv`) s'ha cancel·lat amb autorització explícita mentre es verificaven els desaments de les variables. El desplegament definitiu `Gc6qr1Rhvs27HkiTyrHFYQYtZaxQ` ha acabat en estat Ready, amb el mateix commit `7b9a7ac3f8ee65ea6f7e80a9cc7460a62c0c17cd` que producció. Adreça estable: `https://energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app`. Portada, pàgina d'accés, acadèmia i sessions comprovades al navegador; la navegació es manté dins del domini de preview. L'acadèmia mostra actualment el mateix missatge de cursos pròxims que la pàgina de producció, comprovat amb una consulta visual sense modificar-la. Les funcionalitats amb pagaments o enviaments continuen pendents de credencials de prova.
- El build de Vercel executa `prisma migrate deploy`. Les migracions futures només s'han d'executar contra la base de preview fins a l'aprovació explícita de la publicació.
- Hi ha un projecte homònim dins de l'equip `xmonfort`, sense repositori connectat i amb adreça provisional `energia-y-divinidad-blond.vercel.app`. No assumir que és el projecte de producció d'Aleyda.

## Criteris d’Aleyda i preparació de serveis (2026-10-18)

- Instrucció explícita de Xavier: els seus criteris comercials d’Amor Sanación Alquimia poden ser diferents dels d’Aleyda. NO copiar la política de cancel·lació de 24 hores ni activar reemborsaments automàtics en aquest projecte basant-se en aquella política. Cal consultar Aleyda abans de canviar cancel·lacions, devolucions o altres condicions comercials. Preparar serveis de proves no autoritza canviar aquestes condicions ni producció.
- Destinatari únic autoritzat pels correus de Preview: aleydapaola@proton.me. No utilitzar la bústia, comptes ni credencials d’Amor Sanación Alquimia.
- La branca remota main i preview verificades continuen al mateix commit base 7b9a7ac3. La main local divergent s’ha de conservar amb una referència abans de reconciliar-la amb origin/main. AGENTS.md s’ha de publicar a preview perquè les instruccions siguin compartides.
- Preparació de Preview: tots els enviaments Resend passen per deliverEmail, que fora de producció exigeix PREVIEW_EMAIL_RECIPIENT vàlid, substitueix to/replyTo, retira cc/bcc i afegeix [PREVIEW]. Sense clau o destinatari vàlid no envia. La clau dedicada de Resend i la prova d’entrega encara requereixen configurar el compte correcte.
- Sandbox obligatori fora de producció per PayPal, Wompi (prefixos test per claus i secrets) i endpoints Nequi. Verificació real de signatures PayPal via API, no només presència de headers. No s’ha canviat la lògica de cancel·lació ni refund.
- Calendari fora de producció només amb PREVIEW_GOOGLE_CALENDAR_ID explícit i diferent del calendari original. Newsletter fora de producció només amb PREVIEW_MAILCHIMP_LIST_ID explícita i diferent de la llista original. Edició Sanity només si el dataset coincideix amb PREVIEW_SANITY_DATASET i no és production; la lectura pública es conserva.

- La main local ja està alineada amb origin/main (7b9a7ac3); l’historial local anterior 384f9a9a es conserva a backup/main-before-preview-alignment-2026-10-18. No s’ha modificat la main remota ni producció.
- Resend d’Aleyda verificat (domini energiaydivinidad.com Verified). Clau «Energía y Divinidad Preview» creada amb Sending access limitada a aquest domini i desada com a Secret RESEND_API_KEY exclusivament a Preview amb autorització explícita. La connexió original de Production/Development es conserva. PREVIEW_EMAIL_RECIPIENT=aleydapaola@proton.me exclusivament Preview. L’entrega real encara s’ha de verificar després del desplegament.
- Verificació local: npm run test:preview (20 proves amb fetch simulat, sense accedir a serveis reals) i tsc --noEmit --incremental false. Node 22.18+ o 24 per executar les proves TypeScript sense dependències addicionals.
- La newsletter també substitueix el destinatari pel de prova fora de producció, a més d’exigir una audiència separada. No activar Mailchimp sense aquesta configuració.

## Resultat correu i preparació PayPal

- Preview 99e65eba desplegada Ready a Vercel (4D3Vabu4jkPiPPHPGa7uw4Jz1Nhq). Correu de contacte de prova entregat a aleydapaola@proton.me amb [PREVIEW], registre Resend 01a150ab-df51-70f6-afe0-098058f9a5d2. Producció continua a 7b9a7ac3.
- PayPal Developer verificat al compte Aleyda Vargas Galvis: aplicació existent «Energia y Divinidad Sandbox», compte sandbox de negoci CO. Cap webhook existent. No crear una aplicació duplicada. Xavier ha autoritzat transferir les credencials exclusivament a Preview i crear el token Vercel «PayPal sandbox EYD» i el webhook. Configuració completada al compte correcte: NEXT_PUBLIC_PAYPAL_CLIENT_ID com a Config Preview; PAYPAL_CLIENT_SECRET i PAYPAL_WEBHOOK_ID com a Secret Preview; PAYPAL_ENVIRONMENT=sandbox. Valors de producció preservats. Webhook sandbox 82G12708WX690325H, només PAYMENT.CAPTURE.COMPLETED i PAYMENT.CAPTURE.DENIED, apunta a /api/webhooks/paypal de la Preview amb el token privat autoritzat. No subscriure encara esdeveniments de subscripcions o reemborsaments sense revisar i provar els seus fluxos. El pagament complet de prova continua pendent.
- Preparada correcció del processament d’avisos de captura: recuperar la referència de la comanda a partir de supplementary_data.related_ids.order_id i llegir l’import de resource.amount. Els errors de verificació/processament han de retornar un estat d’error perquè PayPal pugui reintentar. La petició de verificació conserva el JSON original. No s’han canviat condicions comercials ni iniciat reemborsaments.

- Comprovació de tipus repetida després del commit 9e4841d8: correcta. Les 29 proves locals prèvies continuen aplicables; cap canvi nou de codi en aquesta configuració.

## Correcció horària de sessions — 2026-10-19, només Preview

- Les dues entrades de reserva transmeten el dia civil YYYY-MM-DD, sense convertir la mitjanit del navegador a UTC. El checkout combina aquest dia amb l’hora de Colòmbia (-05:00) i etiqueta explícitament el fus. Els enllaços antics amb dates ambigües tornen a la selecció de sessió.
- El selector d’horaris usa el fus IANA i la data de reserva: respecta l’horari d’estiu/hivern i indica canvis de dia. Els correus de confirmació de sessió i els avisos administratius mostren hora de Colòmbia.
- 35 proves locals correctes (inclouen Madrid, Bogotà, Los Angeles, Tòquio, UTC, dates invàlides, canvi d’hora i format 12h amb canvi de dia). Tipus i lint revisats; lint conserva avisos previs. No s’ha executat cap base de producció ni canviat polítiques comercials.
- El desplegament anterior 086be5ec de documentació va fallar amb P1002 en adquirir un bloqueig de migracions a la base de Preview; la versió funcional 9e4841d8 sí que constava Ready. Verificar el desplegament nou abans de fer el pagament fictici; no desactivar els bloquejos de migració.
- PayPal ha tornat a demanar iniciar sessió per accedir als Sandbox Accounts. La prova completa de pagament, webhook, registre únic de reserva i entrega del correu continua pendent.

## Verificació posterior i treball local — 2026-10-19

- PayPal sandbox completat: comanda PP-SJNUV2AYCL, 100 USD ficticis, una única reserva CONFIRMED i pagament COMPLETED. Instant 2026-10-23T15:00:00Z (10:00 Colòmbia). Webhook PAYMENT.CAPTURE.COMPLETED processat sense error. Confirmació i avís de venda Delivered a aleydapaola@proton.me amb [PREVIEW]. Horari 10:00–11:30 desactivat al calendari web de Preview. No s'ha cancel·lat ni reemborsat; política d'Aleyda pendent.
- Els fitxers locals `.env` i `.env.local` encara contenen la connexió original i serveis reals. No executar Next, Prisma, Studio, Sanity ni scripts administratius directament per evitar les proteccions. La substitució per credencials de proves continua pendent; no tractar la configuració local com a separada encara.
- Els scripts npm `dev`, `build`, `start`, `prisma:migrate`, `prisma:migrate:deploy` i `prisma:studio` passen per `scripts/run-local.mjs`. Carrega l'entorn de Next i el transmet al procés fill, també per a Prisma, perquè tots dos utilitzin la mateixa connexió validada. Només accepta els endpoints verificats de Neon Preview d'EYD i rebutja `VERCEL_ENV=production` localment. Si es canvia la branca de Neon, verificar propietat i aïllament abans d'actualitzar la llista.
- `npm run local:check` valida sense connectar a la base. Amb els fitxers locals actuals es bloqueja correctament, abans d'iniciar l'aplicació. Això és una protecció de base de dades, no una validació de totes les credencials de serveis. No afegir-hi només la connexió de proves deixant les claus reals: preparar el conjunt complet de configuració local.
- El script `vercel-build` es conserva; la protecció local no canvia els desplegaments de Vercel ni constitueix una autorització de publicar a producció.
- Google Calendar verificat al compte energiaydivinidad@gmail.com. Encara no s'ha creat el calendari de Preview: Google ha requerit una nova verificació d'identitat abans de continuar. Cal un calendari de proves privat i accés de servei limitat a aquest calendari abans d'activar la sincronització.


## Calendari separat de Preview — 2026-10-19

- Compte Google verificat: energiaydivinidad@gmail.com. Calendari privat «Energía y Divinidad — Preview», fus America/Bogota, ID d94a750a191a4e86896dd3b84ce7bcaf718ca3f443b4f8b17a41ac8a8d3546a5@group.calendar.google.com.
- El compte no tenia permisos sobre l'antic projecte Cloud energia-y-divinidad. S'ha creat energia-y-divinidad-preview i habilitat Calendar API, sense activar facturació. Identitat EYD Preview Calendar: eyd-preview-calendar@energia-y-divinidad-preview.iam.gserviceaccount.com, sense rols generals de projecte; compartició writer exclusivament del nou calendari privat, sense administrar compartició.
- Amb autorització explícita, clau nova desada com a Secret GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY exclusivament Preview a Vercel d'Aleyda. GOOGLE_SERVICE_ACCOUNT_EMAIL i PREVIEW_GOOGLE_CALENDAR_ID nous exclusivament Preview. Els valors originals de la clau i l'adreça continuen a Production; GOOGLE_CALENDAR_ID original es conserva per a la comprovació d'aïllament. Configuració de fus Preview America/Bogota; conservar el valor original de Production.
- Prova real contra Google executant lib/google-calendar.ts sense modificar-lo i amb magatzem de reserva en memòria (sense carregar .env ni Prisma): inserció, instant 2026-10-26T15:00:00Z = 10:00 Colòmbia, durada 90 minuts, actualització del mateix esdeveniment, absència de duplicats/assistents i eliminació final verificades. No equival a una nova compra completa des del desplegament. Reserva PayPal anterior preservada, sense cancel·lar ni reemborsar.
- Els canvis i credencials nous són per a Preview; la publicació EYD a Production continua requerint aprovació explícita. Cap canvi de política comercial.

- Distinció visual reforçada a petició de Xavier: calendari reanomenat i verificat després de recarregar com «PRUEBAS — NO REAL — Energía y Divinidad», descripció explícita de reserves fictícies. Fora de Production, cada esdeveniment afegeix [PRUEBA — NO REAL] al títol i un avís al començament de la descripció. Els esdeveniments de Production conserven el format original. No enviar cap missatge a Aleyda sense instrucció explícita.

## Migracions de Vercel Preview — correcció del bloqueig P1002

- El desplegament f479d6cf (EyywzpUboLXaymeySwrVih7FjzQB) ha fallat esperant pg_advisory_lock(72707369) contra l'endpoint pooled de Neon Preview, abans de compilar. No s'ha desactivat el bloqueig ni cancel·lat cap sessió de base de dades.
- vercel-build executa scripts/migrate-vercel.mjs. Només a Vercel Preview valida el servidor de la base amb la mateixa llista de seguretat local i passa la connexió directa del mateix endpoint al procés de Prisma. Conserva credencials, base i opcions TLS; retira pgbouncer. El procés Next posterior conserva DATABASE_URL pooled. Production conserva el comportament anterior; l'execució local d'aquest script queda bloquejada.
- 44 proves locals correctes, incloses preservació del fus, aïllament, connexió directa i rebuig de servidors no autoritzats. No s'ha connectat a cap base des dels tests locals. Verificar al desplegament que el pas de migracions acaba i que la font és la nova branca Preview abans de donar les etiquetes de cites per actives.

## Pagaments manuals fora de producció

- L'auditoria ha trobat que els fluxos WOMPI_MANUAL i BREB_MANUAL no passaven per les proteccions de les API sandbox: podien recuperar links o instruccions de pagament real. Fins que hi hagi un circuit de prova específic, /api/checkout/wompi-manual, /api/checkout/breb i la selecció wompi_manual del carret es rebutgen fora de Production abans de crear comandes, enviar correus o accedir als links.
- Les pàgines /pago/wompi-pending i /pago/breb-pending mostren un avís de proves fora de Production i no les instruccions de pagament. PayPal sandbox continua disponible. Els fluxos de Production es conserven; no s'han modificat condicions comercials ni publicat a producció.
- 48 proves correctes, incloses invocacions dels tres handlers amb dependències externes bloquejades que verifiquen el rebuig abans d'efectes laterals i el pas al flux original de validació en Production. Comprovació de tipus correcta.

## Durada de les cites — correcció a Preview

- Compra fictícia PP-WJZWNFEZYB completada i sincronitzada al calendari privat de proves, però s’ha detectat duration nul·la i fallback erroni de 60 minuts, quan la sessió i la web indiquen 90. La durada s’obté ara de la configuració de sessió del CMS i es guarda en crear la reserva pagada; el calendari respecta la durada desada. Les reserves antigues sense durada consulten la configuració, amb valor de reserva de 90 minuts si el CMS no està disponible. No modifica cap registre existent automàticament ni les polítiques comercials.
- 55 proves correctes; proves amb dependències simulades del processament de pagament i sincronització de calendari comproven persistència de durada, inici i final, fus, etiquetes de proves i actualització del mateix esdeveniment. La verificació del desplegament i d’una nova reserva completa continua pendent.

## Canvi de prioritats de Xavier — 19/10/2026

- TOTS els pagaments queden aparcats perquè Aleyda vol canviar-los. No continuar la compra fictícia pendent del 27/10, Wompi, Bre-B, subscripcions ni devolucions. Continuar únicament continguts, newsletter, configuració local i calendari sense pagaments.
- Els originals .env i .env.local s’han preservat en una còpia privada local ignorada per Git, fora dels fitxers carregats per Next/Prisma. Configuració activa nova: Neon Preview verificat, secret de sessió local independent, URLs localhost i Sanity preview. Sense claus de pagaments, correus, calendari, Mailchimp ni escriptura CMS. Els serveis externs es proven a Vercel Preview; no copiar-hi les claus originals. La comprovació local exigeix també continguts Preview i rebutja credencials externes heretades.
- Sanity preview encara pendent de l’autorització explícita sobre lectura pública demanada per la revisió automàtica. No activar les variables de Vercel fins a crear i verificar els continguts. Mailchimp real és forever_free, una audiència d1b9e1cbf7; no afegir-hi proves. Pendent compte de Mailchimp separat.

- Verificació de la nova configuració local: consulta de lectura a Neon Preview correcta, secrets i còpies ignorats per Git, 58 proves correctes, tipus i lint dels canvis correctes. Arrencada local i /api/auth/providers HTTP 200 comprovats; servidor de comprovació aturat. Polling local de Watchpack evita EMFILE sense canviar pagaments ni configuració de producció. La càrrega de continguts i l’edició remota continuen pendents del dataset autoritzat. No enviar aquest canvi a Vercel abans de preparar el dataset i les variables Preview corresponents: la protecció de Studio rebutja una Preview que encara apunti a production.

## Sanity separado y validado — 19/10/2026

- Autorización explícita de lectura pública recibida. Dataset `81jpalr2/preview` creado como public en el proyecto `energia-y-divinidad`. Copiados 198 documentos ya publicados y 187 assets al dataset propio; excluidos drafts, documentos de sistema, discountCode y published=false. No usar este dataset público para datos personales o privados.
- Importación oficial sin avisos; 385 documentos públicos, referencias completas y todas las URLs de assets en /81jpalr2/preview/. Las imágenes que Sanity reasignó usan referencias actualizadas. Prueba de edición y retirada del marcador correcta, revisiones de Production intactas (digest de origen 9d2110260595784c0384393ad80b048440218f06ea0f59acc9538ea19bcd1578).
- CORS añadido únicamente para el origen estable de Preview, con credenciales de usuario Sanity; orígenes anteriores preservados. localhost:3000 y localhost:3333 ya estaban autorizados. No se creó ni transfirió ninguna clave de escritura nueva.
- Vercel de Aleyda: NEXT_PUBLIC_SANITY_DATASET=preview y PREVIEW_SANITY_DATASET=preview exclusivamente Preview. El valor production original conserva Production y Development; proyecto 81jpalr2 compartido. SANITY_API_TOKEN permanece fuera de Preview.
- La guía de Sanity distingue editor de pruebas y editor real. El contenido se traslada selectivamente tras aprobación; integrar Git no copia Sanity. No publicar a Production ni reanudar pagos. Mailchimp sigue pendiente de una cuenta de pruebas separada.

## Reprogramación: zona horaria explícita — 19/10/2026

- Al entrar con el usuario ficticio se detectó que Mis Sesiones y el formulario de reprogramación interpretaban horas del navegador sin indicar el huso. La tarjeta muestra ahora fecha/hora de Colombia y, cuando es distinta, la conversión a la zona del dispositivo. El formulario indica Colombia (UTC−5), usa colombiaBookingInstant para enviar el instante y calcula el día mínimo según Colombia. El correo de reprogramación fija también America/Bogota y lo etiqueta.
- No se modifican límites de reprogramación, cancelaciones, pagos ni políticas comerciales. 62 pruebas correctas, incluyendo el envío real del handler del formulario con fetch simulado desde Madrid, Tokio y Los Ángeles, renderizado de la tarjeta y correo con servidor UTC. Comprobación de tipos correcta. Verificación remota de la reserva ficticia y calendario pendiente del nuevo despliegue.
