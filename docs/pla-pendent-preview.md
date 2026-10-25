# Pla de feina pendent de Preview

Actualitzat el 25/10/2026. URL: https://preview.energiaydivinidad.com. Treball només a `preview`; producció requereix aprovar una versió concreta. L'accés de Vercel es manté.

| Ordre | Tasca | Execució i criteri de tancament | Dependència |
| --- | --- | --- | --- |
| 1 | Tancar l'API antiga de reserves | Completat a Preview f8672ed5: consulta amb sessió i propietat o ADMIN; creació antiga retirada. 401 anònim i 410 en el flux antic verificats remotament. | Revisar compatibilitat amb consumidors externs abans d'aprovar Production |
| 2 | Preus i newsletter de proves | Completada la preparació a Preview: mateixa projecció de preus que les fitxes, proves GROQ de format nou/antic i gratuïtat; newsletter sense compte de proves retorna 503 sense alta. Preus manipulats rebutjats amb 400 en ambdós mètodes. | Mailchimp separat per activar i provar els enviaments |
| 3 | Disponibilitat i concurrència de sessions | Implementat al codi: horari compartit de Colòmbia, durades, marges, festius, franges bloquejades, antelació i solapaments parcials. Reprogramació, crèdits, bescanvi de packs, entrega de sessions pagades i reactivació ADMIN comparteixen bloqueig transaccional. Prova amb Neon Preview: una guanyadora de dues peticions per a la mateixa franja; data inicial sense consumir canvis; dos canvis simultanis respecten el límit de dos. Desplegada a 287e38ff Ready; agenda remota contrastada amb l’ocupació real de Preview per a tres dates, amb durada de 90 minuts i noindex. Formulari privat sense sessió 401, data invàlida 400 i entrada antiga 410. Nova compra Bre-B simulada completada amb cita única del 2/11 a les 10:00 Colòmbia, durada 90 i sincronització Google registrada sense error. Rebut amb data i política comprovats a Proton. Resta vista externa del calendari i recorregut del client. | Implementació i proves específiques abans de proposar Production |
| 4 | Preparar continguts i administració de proves | Creats a Sanity 81jpalr2/preview un curs de text i un taller futurs amb «PRUEBA — NO REAL», sense reunions ni informació personal. Cap curs privat ni esdeveniment anterior substituït. Compte dedicat creat i verificat per Xavier; rol ADMIN assignat només a Neon Preview i accés a /admin/orders comprovat al navegador. | Completat per al compte ADMIN; fixtures sintètiques preparades |
| 5 | Completar la matriu de compres | Bre-B simulat: quatre tipus completats amb una entrega i una auditoria per ordre; confirmacions i avisos rebuts a la bústia autoritzada. Sessió amb 90 minuts i Google sincronitzat sense error. PayPal: comandes preparades sense captura; pendent sessió del comprador dedicat i recorreguts complets amb permisos de client. No confondre preparació amb entrega. | Comprador sandbox, ADMIN de proves i continguts sintètics; mai pagaments reals |
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
- Correcció visual addicional preparada: llista i fitxa de productes digitals usen pricingProjection, com el checkout, amb prova GROQ que contrasta preus nous/antics contra els realment mostrats. Dates de vendes amb fus de Colòmbia i referència de comanda llegible. 109 proves correctes i tipus correctes; pendent desplegament d’aquesta correcció.
