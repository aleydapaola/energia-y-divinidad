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
