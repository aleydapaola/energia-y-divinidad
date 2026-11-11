# Pla mestre — captació de newsletter d'Energía y Divinidad

Actualitzat: **10/11/2026 · Europe/Madrid**. Estat global: **EN CURS**.

**Relleu més recent per canvi de compte:** llegir primer
[CONTINUACION_CORREO_Y_PUBLICACION_2026-11-10.md](CONTINUACION_CORREO_Y_PUBLICACION_2026-11-10.md).
Inclou l'encàrrec posterior del hotfix de correus, separat de newsletter. Git directe
ja permet consultar status; els bloquejos de gitconfig descrits més avall són
històrics. El bloqueig vigent és l'accés als auxiliars/remot de Git. El nou hotfix
segueix local; cap nova publicació. Els dos permisos proposats encara no estan
autoritzats ni aplicats. Conservar aquest pla i tots els seus pendents.

Aquest és el document principal de continuïtat. Es pot llegir des d'aquest
compte de Codex o passar com a fitxer a un altre compte. La nova sessió ha de
contrastar les evidències amb el repositori i Preview abans de continuar.

## Represa vigent — 11/11/2026

Xavier demana acabar la implementació de captació. Aquesta entrada substitueix els bloquejos Git i les identitats antigues de les seccions inferiors.

- Build inicial 0664ffeb Ready en 3m57s, 3 avisos, dpl_b8NEwnBBhbHs2EkeTC1aQTApP65n i domini Preview assignat. Cal segon build justificat per la superposició detectada a QA, no es repeteix cap publicació de Production.
- N06/N07 reobert i corregit: la QA interactiva a 375×500 ha mostrat invitació damunt del formulari abans del focus. Ara data-newsletter-form identifica el formulari i la invitació es bloqueja/oculta quan qualsevol formulari és visible; scroll/focus ho comproven immediatament. Nova regressió falla abans i passa després; 20/20 proves afectades correctes. Canvi conservat també al checkout original. Pendent build/QA del nou candidat.
- N05/V05: pendent interactiu comprovat en navegador amb el component real del candidat, React/DOM reals i resposta pending simulada, CSP connect-src none (file:///private/tmp/eyd-newsletter-browser-fixture.html). Primer 375×667 i després 375×500: correu normalitzat en blur, acceptació desmarcada, focus correu→casella→privacitat→botó, una sola sol·licitud simulada, text complet llegible. Obre/tanca diàleg de fixture i conserva pendent sense reenviar. No certifica proveïdor o persistència després de recarregar; la sessió/carrito/ruta són adaptadors. La invitació visible es va ocultar en enfocar el formulari. Preferències del fitxer local, sense modificar visitants Preview.
- N12 integració publicada només a Preview: 0664ffeb745983a2a098adfee5bd6504fbf19a44, push per VS Code acreditat amb ls-remote. Build dpl_b8NEwnBBhbHs2EkeTC1aQTApP65n en curs; cap publicació de main. Suite completa de la integració: 269/269 proves simulades correctes.
- N12: Git operatiu amb el binari directe. Remot contrastat: preview a6d272ac1bb6a34ca3f177cbf964846983f44d55; main cb4eaf6215f433ac0473a78c4cb06bbe961825ba. Vercel recarregat: dpl_C271LDw9iczWELM4wYUhubt5ciXS Ready/Latest, domini Preview, equip/projecte/repositori/branca correctes.
- Integració preparada al clon net /private/tmp/eyd-email-hotfix-20261110, branca preview: revert sense commit de 58afe35e i aplicació selectiva de N03/N07/N08, dues proves de component i fixture. Conflicte únic a NewsletterForm resolt conservant captació, consentiment i normalització del hotfix. Original preservat; sense pull/reset/sync.
- N09/N17: integració comprovada amb 80/80 proves simulades correctes (captació, formulari, invitació, regal, registre, àudio i normalització), 11/11/2026. Prettier dels components/tests/fixture correcte i git diff --check correcte. No correus ni altes reals.
- V10 local: TypeScript correcte; ESLint de codi integrat i proves noves sense errors (3 avisos previs a Header/gift). Lint ampliat als tests històrics detecta un curly preexistent a newsletter-audio.test.mjs i avisos de mocks; no s’ha modificat aquest test. local:check invocat: npm acaba 255; invocació directa del mateix guarda bloqueja per DATABASE_URL absent. Sense Next, build o migracions locals; el build es comprovarà a Vercel Preview.
- N03/N07/N08: integrats localment; no reimplementats. Pendent comprovacions de la integració, commit, build Preview i V01–V10 finals. Cap canvi de Production ni enviament.
- Skill Sites inaccessible (Operation not permitted també amb escalació); es continua al repositori Next/Vercel existent sense canviar allotjament ni connectors.

## 0. Represa amb accés autoritzat — 10/11/2026

- **N05/V05 i N15 — pendent visual simulat verificat:** el generador local
  ara també crea `newsletter-pending.html` amb `NewsletterForm.tsx` real,
  estat injectat i el missatge literal de pendent de l'API. Revisat primer
  a 375×667, després 375×500 i finalment 1280×800: instruccions i text sense
  compte llegibles, sense retall horitzontal observat. Avís visible de
  simulació; sense formulari, scripts, xarxa ni enviament. No acredita resposta
  de proveïdor, hidratació, persistència després de recarregar o versió final.
  Fitxer modificat: `scripts/newsletter-visual-fixture.mjs`; detalls a secció 6.
  N16 r2 conserva les seves tres pàgines històriques; no s'ha regenerat.
- **N12 — efecte de la recàrrega comprovat:** Git directe ja supera el
  gitconfig del sistema i ara retorna exit 128 amb `fatal: unable to access
  '/Users/xmonfort/.gitconfig': Operation not permitted`. Mateix resultat
  amb execució elevada. El perfil actiu ja inclou la primera excepció;
  s'ha afegit exactament `"/Users/xmonfort/.gitconfig" = "read"` al mateix
  perfil local, sota l'autorització vigent per a lectures Git necessàries.
  No s'ha consultat ni imprès el contingut d'aquesta configuració. Cal carregar
  aquesta segona regla abans del següent intent; no reinstal·lar Git ni
  ignorar configuracions. Root deny, exclusions de secrets i xarxa conservats.
  Preview revalidada a Vercel en aquesta represa: mateix domini, equip,
  projecte, repositori, branca, SHA i desplegament Ready/Latest detallats a sota.
  N12 continua bloquejat, sense status complet, commit o desplegament.
- Xavier ha autoritzat expressament en aquesta conversa l'ús de la sessió
  actual de Google Chrome for Testing per revisar només Preview, sense altes,
  enviaments ni canvis de dades. No s'han copiat sessions ni credencials.
- **N12 / V01 — identitat de la Preview actual revalidada a la UI de Vercel:**
  domini `preview.energiaydivinidad.com`, equip
  `aleyda-paola-vargas-projects`, projecte `energia-y-divinidad`, repositori
  `aleydapaola/energia-y-divinidad`, branca `preview`, SHA
  `75edba4c5d5eb3387be59803535c339890a6206e`, desplegament **Ready**
  `dpl_6gUN5MmwoAwr5ZL54dugmC1xReRw`, marcat Latest i amb el domini assignat.
  Evidència: [Deployment Details](https://vercel.com/aleyda-paola-vargas-projects/energia-y-divinidad/6gUN5MmwoAwr5ZL54dugmC1xReRw).
- **Correcció de la inferència anterior:** `dpl_5fKi8NhUWYiDF5XsSbZ5x7QZndmN`
  apareix a l'iframe `vercel.live` de la barra; no identifica l'aplicació
  desplegada. No utilitzar-lo com a versió del web.
- Els primers intents de Git dins de Codex fallaven amb
  `invalid active developer path ... missing xcrun`. **Diagnòstic corregit:**
  Xavier ha executat `git --version` al Terminal del Mac fora de Codex i
  obté `git version 2.50.1 (Apple Git-155)`. No afirmar que falten les eines
  al Mac ni reinstal·lar-les: cal resoldre l'execució autoritzada dins de Codex.
  Prova directa i de només lectura amb el Git instal·lat:
  `/Library/Developer/CommandLineTools/usr/bin/git status --short --branch`
  arrenca però falla amb `fatal: unable to access
  '/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig':
  Operation not permitted`. No ignorar la configuració del sistema per superar-lo.
  **Xavier ja ha autoritzat aquesta lectura per a les tasques Git necessàries.**
  L'intent posterior amb autorització elevada encara retorna el mateix error:
  l'autorització del xat no ha canviat el perfil efectiu. No tornar a demanar
  aquell consentiment. **Regla concreta ja afegida a `.codex/config.toml`**
  en la continuació anterior, amb l'autorització de Xavier. La primera consulta
  posterior encara era denegada, però després de recarregar ja supera aquesta
  ruta i s'atura a `~/.gitconfig`, com detalla l'últim resultat de N12 a dalt.
  La segona regla també està escrita, pendent de carregar. No reaplicar patches.
  `.git/HEAD`, la ref local i `.git/config` confirmen checkout EYD / `preview`
  / SHA anterior, però encara no certifiquen staged, no seguits ni remot.
  N12 continua bloquejat per integrar N03/N07/N08; V01 de la **versió final**
  continua pendent perquè els retocs encara són locals. Cap desplegament nou.
- Continuar QA independent del blog i les rutes sobre aquesta versió servida,
  diferenciant-la de la versió final. No repetir les 67 proves ni N03/N08 estàtics.
- **Resultat d'aquesta represa:** N04 ampliat amb blog a 375×667, 375×500 i
  després 1280×800; N17 completat amb 5 proves de component, lint i format
  correctes. Després de l'entrada personal de Xavier, N10 revisat a l'ADMIN
  servit amb les mateixes mides; estat sense mostra revisat separadament en
  HTML local amb dades sintètiques (N15 ampliat). Detalls i límits a 5–6.
- **N05 / V05 parcial ampliat el 10/11:** error de connexió observat al
  formulari real de Preview `75edba4` a 375×667, 375×500 i després 1280×800.
  Mode Offline verificat abans d'introduir una adreça sintètica `.invalid`;
  submissió amb teclat, missatge d'error llegible, correu i consentiment
  conservats, botó rehabilitat. Formulari descartat amb `about:blank` abans
  de restaurar No throttling; cap reintent online. No és alta confirmada,
  resposta de proveïdor, teclat virtual físic ni QA de la versió final.
- Comparació actual de només lectura amb l'índex v2: 735 entrades, una
  restringida omesa; diferències als set fitxers seguits documentats al
  seguiment, sense conflictes o fitxers permesos absents detectats. No
  certifica staged/HEAD ni tots els no seguits. Índex intacte.
- **Punt segur següent:** carregar la segona lectura Git (`~/.gitconfig`,
  mateix error també elevat); l'accés ADMIN de prova ja està recuperat en aquesta conversa. Integrar els
  retocs en una Preview identificada abans de tancar V01–V10. No s'ha canviat
  codi d'aplicació, arrencat Next ni publicat res. **N16 r2** inclou N17,
  fixture ADMIN i documents fins a aquella revisió; el checkout incorpora
  després aquesta QA offline i el diagnòstic de Git corregit. No regenerar
  l'arxiu en cada represa: actualitzar-lo abans d'un nou traspàs a altre equip.
- **Paquet vigent N16 r2:**
  `/private/tmp/eyd-newsletter-handoff-updated-WD5jBm/EYD-newsletter-continuacio-2026-11-10-r2.zip`.
  17 fitxers, SHA-256/mides del manifest verificats després de reobrir el ZIP;
  sis fitxers al patch i tres HTML estàtics. R1 conservat com a històric.
  `diff` ha fallat amb `EPERM`, també elevat: paquet creat amb `adm-zip`
  0.5.18 ja instal·lat, sense dependències noves. Patch de fitxer complet amb
  originals contrastats amb l'índex i reconstrucció exacta dels sis resultats;
  no s'ha pogut executar `git apply --check` ni `patch` natiu.

### Traspàs anterior per canvi de compte — registre conservat

Xavier demana deixar l'estat preparat perquè la quota del compte s'està
esgotant. **Aquesta sessió es tanca després de documentar el traspàs; el pla
continua EN CURS.** No s'ha començat cap altra modificació de codi en aquest pas.

- **Ja fet:** recerca/pla i prompt; correcció local del diàleg posterior;
  CTA i foto locals revisats a 375×667; WhatsApp dins del flux mòbil revisat
  a 375×500 i conservat flotant a 1280×800; generador de QA estàtica;
  67 proves, tipus i lint correctes en la sessió de desenvolupament anterior.
- **No repetir:** implementar N03/N07/N08, instal·lar Chromium, generar un
  segon sistema de newsletter, repetir altes/correus/baixes reals o tornar a
  executar les 67 proves perquè només s'ha actualitzat documentació.
- **Primer pas pendent:** N12, recuperar Git operatiu i contrastar els canvis
  pendents i la identitat real de Preview. Després integrar N03/N07/N08 i
  verificar-los al desplegament final, no tornar a fer-ne només QA estàtica.
- **Si Git continua bloquejat:** documentar-ho i continuar únicament la QA
  independent pendent de blog, rutes/invitació i ADMIN de prova quan hi hagi
  accés; no reparar el sistema, forçar publicacions ni perdre canvis locals.
- **Bloqueig recontrastat en aquest traspàs:** Git segueix fallant per manca
  de `xcrun`. Referències locals `preview` i
  `75edba4c5d5eb3387be59803535c339890a6206e`, sense certificar staged o remot.
- **Eines:** la finestra de Google Chrome for Testing es podia controlar
  nativament i Xavier havia iniciat Vercel. Comprovar-ne l'estat al nou compte;
  no donar la sessió per heretada ni copiar cookies.
- **Falta per tancar:** V01–V10 de la versió final, build amb entorn segur,
  commit/Preview identificats i aprovació concreta abans de Production.
  Cap dels retocs locals s'ha publicat en aquest traspàs.

**Mateix equip i checkout:** llegir el pla i el seguiment i continuar els
fitxers existents; no reaplicar el patch. **Altre equip:** descarregar el ZIP
actualitzat, disposar del repositori complet i comparar diferències abans
d'integrar. El prompt complet per enganxar al nou compte és a la **secció 10**.

## 1. Objectiu i criteri d'èxit

Una persona nova ha de poder trobar com subscriure's sense que Aleyda li hagi
d'explicar on és el formulari. Des de la web ha de veure un accés clar; des
d'Instagram o WhatsApp ha de rebre un sol enllaç que porti a la captació.

Recorregut desitjat: **veure el regal i la subscripció → deixar el correu i
acceptar → confirmar el correu → rebre la meditació**. Sense crear compte,
comprar ni buscar un formulari amagat al final de la web.

La conversió que interessa és l'alta **confirmada**, no un botó premut ni una
sol·licitud pendent. El pla ha de resoldre la localització del formulari i la
usabilitat abans d'intentar augmentar la pressió comercial.

## 2. Com es manté aquest document

**Instrucció de Xavier: cada vegada que una tasca estigui feta, actualitzar
aquest document abans de continuar amb la següent, per no repetir-la.**

- Cada tasca té identificador, estat, evidència i pas pendent.
- «FET LOCAL» no significa desplegat; «PREVIEW PARCIAL» no certifica tota la QA.
- Només marcar una tasca de validació com a completada després d'observar el
  resultat en l'entorn indicat. Anotar data i versió quan es conegui.
- Si hi ha una regressió, reobrir la tasca indicant el motiu; no esborrar-ne
  l'evidència anterior.
- Al final de cada sessió, actualitzar també `AUTONOMY_STATUS.md` amb el punt
  segur de represa. Aquest pla defineix què falta; el seguiment explica l'entorn.
- Una altra sessió no ha de reinstal·lar eines, tornar a programar canvis o
  repetir altes/correus ja verificats per «recuperar context».

## 3. Recerca i sistema escollit

No hi ha evidència que un únic popup o un temps concret sigui el millor per
a totes les webs. La recomanació per a EYD és combinar **accés directe,
formulari visible, pocs passos i una invitació secundària mesurada**.
És una aplicació de la recerca al cas d'Aleyda, no una garantia de conversió.

Fonts consultades el 10/11/2026:

| Font primària | Què aporta | Aplicació a EYD |
| --- | --- | --- |
| [NN/G: Designing Marketing Email and Newsletters](https://www.nngroup.com/articles/newsletters/) | La facilitat i l'esforç reduït són importants en l'alta a newsletters. | Un correu, consentiment i acció clara; sense registre de compte afegit. |
| [NN/G: recerca sobre newsletters, 6a edició](https://www.nngroup.com/reports/email-newsletter-design/) | Estudia com es descobreix una newsletter, la subscripció, la confirmació i la baixa. La versió pública del report compara formularis integrats i recorreguts més complexos. | El formulari visible és la base; el peu i un simple enllaç no han de ser l'únic accés. No s'ha comprat cap informe. |
| [NN/G: Popups, problematic trends and alternatives](https://www.nngroup.com/articles/popups/) | Recomana esperar context i valor abans de demanar el correu i evitar interrupcions en tasques importants. | Invitació no modal després d'interacció; excloure compte, reserves i pagaments. |
| [Google Search Central: interstitials and dialogs](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials) | Afavoreix avisos petits que deixin accessible el contingut i desaconsella cobrir tota la pàgina amb promocions. | Sense pantalla completa, bloqueig de lectura ni redirecció forçada per captar un correu. |
| [Mailchimp: compartir el formulari](https://mailchimp.com/help/share-your-signup-form/) | Un enllaç directe es pot compartir al web, xarxes i altres canals. També es pot allotjar un formulari propi. | Utilitzar la landing pròpia ja implementada, amb orígens Instagram/WhatsApp; no crear una altra audiència ni una segona plataforma. |
| [Mailchimp: single i double opt-in](https://mailchimp.com/help/single-opt-in-vs-double-opt-in/) | Distingeix enviar un formulari de confirmar l'adreça; exposa el compromís entre rapidesa i qualitat de la llista. | Conservar el doble opt-in ja aprovat del formulari independent i mesurar confirmades. No canviar el consentiment ni el registre de compte amb aquesta recerca. |
| [W3C: mida dels objectius, WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Defineix mínims de mida/espaiat i explica el benefici dels controls més grans. | Objectiu de disseny: controls principals d'almenys 44 px, camps de 16 px i comprovació tàctil. No confondre aquest objectiu amb una certificació completa d'accessibilitat. |

No es fan servir percentatges comercials de conversió com a predicció per a
Aleyda. Els 15 segons i 35 % de scroll actuals són una hipòtesi inicial, no un
òptim demostrat. No s'afegeix un popup immediat o d'intenció de sortida.

## 4. Experiència que s'ha d'acabar

### 4.1. Accés que Aleyda pot explicar en una frase

- Landing pròpia `/meditacion-gratis`, amb identitat d'Aleyda i meditació del
  **Ángel de la Guarda de 18:43**.
- Un botó visible en la primera part de la landing mòbil porta al formulari.
- Capçalera amb un accés visible al regal; formulari després de la primera
  presentació de la home; formulari al blog i al peu.
- Text coherent: el regal arriba en subscriure's a la newsletter; no és una
  descàrrega instantània sense subscripció.
- No inventar una periodicitat de newsletter que Aleyda no hagi acordat.

Enllaços de **revisió**, protegits i no destinats a clients:

- `https://preview.energiaydivinidad.com/meditacion-gratis`
- `https://preview.energiaydivinidad.com/meditacion-gratis?origen=instagram`
- `https://preview.energiaydivinidad.com/meditacion-gratis?origen=whatsapp`

Després de publicar i verificar la versió aprovada, preparar els equivalents
amb el domini públic canònic **verificat en aquell moment**. No afirmar que
aquests enllaços públics ja funcionen perquè existeixin a Preview.

Text que Aleyda podrà reutilitzar després d'aquella verificació:

> Recibe gratis mi meditación del Ángel de la Guarda al suscribirte a mi
> newsletter aquí: [enlace público verificado]. Solo necesitas tu correo.
> Confírmalo y recibirás el regalo; no necesitas crear una cuenta.

No publicar el text ni editar biografies o enviar missatges des d'aquesta tasca.

### 4.2. Formulari i confiança

- Demanar només email i l'acceptació explícita ja aprovada, inicialment desmarcada.
- Botó «Recibir mi meditación y suscribirme».
- Privacitat accessible sense perdre el formulari.
- Errors comprensibles i missatge de pendent persistent amb el següent pas:
  confirmar el correu i revisar Spam/Promocions si cal.
- No prometre un correu nou a qui ja està subscrita; no reactivar baixes.
- Mateixa adreça/audiència: un contacte i un regal, en tots dos ordres
  newsletter→compte i compte→newsletter.
- Conservar Mailchimp/Resend i els circuits verificats. El registre de compte
  manté la seva verificació pròpia; no duplicar-ne el correu de confirmació.

### 4.3. Mobile first i invitació

- Primer 375 px, després pantalles curtes i després escriptori. L'emulació de
  Chrome no substitueix una prova amb teclat virtual d'un mòbil físic.
- Sense controls tapats per WhatsApp, invitació, carrito o diàlegs.
- Invitació tancable, no modal, sense robar el focus i sense aparèixer mentre
  s'escriu. Manté el temps/desplaçament, exclusions i preferències aprovats.
- La invitació és un suport: la captació ha de funcionar també sense veure-la.
- No pressuposa que una persona autenticada ja estigui subscrita.

## 5. Inventari auditat i tasques

Llegenda: **FET LOCAL** = preparat al directori de treball; **PREVIEW PARCIAL**
= una part observada al web servit; **PENDENT** = falta executar/observar;
**BLOQUEJAT** = prerequisit concret absent. Cap d'aquests estats acredita Production.

| ID | Tasca | Estat a 10/11/2026 | Evidència / pas següent |
| --- | --- | --- | --- |
| N01 | Investigar i definir el sistema de captació i el pla portable | FET DOCUMENTAL | Aquest document, fonts i criteris de tancament. Actualitzar-lo a cada tasca completada. |
| N02 | Landing compartible, regal existent i alta sense compte | PREVIEW PARCIAL | Pàgina carregada a Preview; `app/meditacion-gratis/page.tsx`. Falta verificar versió definitiva i futur enllaç públic. |
| N03 | Accés directe al formulari en mòbil i encuadrament de la foto | FET LOCAL; QA ESTÀTICA CORRECTA | A 375×667, render local amb CSS actual: CTA visible, activable amb teclat, porta al formulari `#recibir`; cara d'Aleyda ben enquadrada. Adaptadors estàtics de Next Image/Link, sense hidratació. Falta confirmar-ho a la Preview final, on abans no apareixia el CTA nou. No tornar a implementar-los. |
| N04 | Formulari visible a home, capçalera, peu i blog | IMPLEMENTAT; PREVIEW PARCIAL | Home, capçalera i peu observats a 375 px. Blog revisat el 10/11 a 375×667 i 375×500 sobre SHA `75edba4`: bloc del regal abans del llistat, camp/casella/botó i explicació accessibles amb scroll, sense retall horitzontal observat; focus correu→casella→privacitat correcte i privacitat en pestanya separada. Blog de prova sense articles. `MeditationSignup.tsx`, `Header.tsx`, `Footer.tsx`, `app/blog/page.tsx`. Falta versió final amb N08: WhatsApp encara tapa part del consentiment segons el scroll a 375×667. |
| N05 | Formulari simple, consentiment, validació i següent pas | PREVIEW PARCIAL + QA DE COMPONENT; PENDENT VISUAL LOCAL · 10/11 | A 375 px: casella desmarcada, botó desactivat fins acceptar, validació nativa i privacitat. Error de xarxa real del component servit, amb Offline de DevTools abans d'emplenar, a 375×667, 375×500 i després 1280×800: missatge llegible, camp i acceptació conservats, botó reactivat. Connexió restaurada després de descartar el formulari; sense reintent online. Pendent visual ara comprovat amb component real en HTML estàtic sintètic a les mateixes mides, text igual a API (N15). N17 conserva 5 proves simulades correctes, no repetides. Falta versió final i pendent interactiu; cap alta real repetida. |
| N06 | Invitació discreta i preferència de tancament | IMPLEMENTAT; PREVIEW PARCIAL | Observada a 375×667 i 375×500; tancament real i clau de preferència amb caducitat. No s'ha validat tota la matriu de rutes/carrito/escriptori. |
| N07 | Amagar la invitació si apareix un diàleg posterior | FET LOCAL I PROVAT | `NewsletterInvitation.tsx` i sis proves a `tests/newsletter-invitation.test.mjs`. Dues regressions fallaven abans i passen després. Falta prova en la Preview que contingui el canvi. |
| N08 | Evitar WhatsApp damunt del camp de correu en mòbil | FET LOCAL; QA ESTÀTICA CORRECTA | A 375×500: formulari sense botó flotant damunt i contacte visible al final del peu. Després, a 1280×800: es conserva el flotant en escriptori i el formulari renderitza. Components/CSS locals amb adaptadors estàtics; falta validar la Preview final, no es dona per tancada tota la QA d'escriptori. |
| N09 | Contacte/regal únics, confirmació i respecte de baixes | PROVES LOCALS I HISTÒRIQUES | 67 proves relacionades repetides i correctes després del retoc N08, tipus correctes i lint sense avisos. Entregues/baixa reals ja consten a l'historial; no repetir-les per recuperar context. |
| N10 | Mesura per origen i resum ADMIN | QA PREVIEW ACTUAL FETA; ESTAT BUIT LOCAL; VERSIÓ FINAL PENDENT · 10/11 | Xavier ha iniciat personalment l'ADMIN de prova. `/admin/communications` revisat a 375×667, 375×500 i després 1280×800 sobre Preview `75edba4` / `dpl_6gUN5Mmwo…`: resum de 30 dies, variants i set orígens llegibles, estats confirmada/pendent/existent/reinscripció diferenciats. Sense newsletter flotant o WhatsApp al resum. Mostra observada: 1 visita control, 3 amb invitació, 0 confirmades; una existent a landing, no presentada com a alta nova. API ja retorna agregats; no altes, reintents o campanyes executats. El «No autorizado» anterior queda com a evidència de l'accés anònim. «Todavía sin muestra» comprovat a les dues variants amb fixture estàtica sintètica a les mateixes mides (N15), sense canviar dades a Preview. Falta revalidació a la versió final. |
| N11 | Tancar la matriu visual i funcional de la versió final | EN CURS | Vegeu secció 7. La revisió mòbil real ja ha començat; escriptori i diverses rutes encara pendents. |
| N12 | Integrar i verificar la correcció en Preview | PRIMER PERMÍS ACTIU; SEGONA REGLA PREPARADA · 10/11 | La recàrrega ha activat el read del gitconfig del sistema. Git ara falla en `/Users/xmonfort/.gitconfig`, també elevat. Afegida només aquesta segona lectura a `.codex/config.toml`, coberta per l'autorització vigent, sense llegir-ne contingut. Root deny, secrets i xarxa conservats. Cal carregar la regla nova i comprovar status abans d'integrar N03/N07/N08. Preview revalidada Ready/Latest `75edba4` / `dpl_6gUN5Mmwo…`. Encara sense status complet, commit/push/desplegament o QA final. |
| N13 | Publicació concreta i material per compartir | PENDENT D'APROVACIÓ FUTURA | Només després de Preview final: donar SHA, proves, enllaç i limitacions a Xavier; esperar aprovació explícita de Production. |
| N14 | Avaluar l'ús real i la captació | PENDENT DESPRÉS DEL LLANÇAMENT | Prova de descoberta sense instruccions i primera revisió de mètriques. Una finestra inicial de 30 dies és una proposta operativa, no garantia de mostra suficient. |
| N15 | QA visual local reproduïble sense secrets o serveis | FET LOCAL; AMPLIAT PER PENDENT · 10/11 | `node scripts/newsletter-visual-fixture.mjs` genera quatre HTML autocontinguts: landing, peu, `admin-capture-empty.html` i nou `newsletter-pending.html`. Components reals amb estats injectats i efectes inerts; dades sintètiques explícites, CSS actual, sense servidor/scripts/xarxa/enviament. Pendent llegible a 375×667, 375×500 i després 1280×800; instruccions i text sense compte complets. Missatge contrastat amb API, role=status/aria-live i CSP comprovats, sense forms/inputs/scripts. Generació, ESLint sense avisos i Prettier correctes. QA anterior ADMIN buit conservada, no repetida. No equival a hidratació, fetch, entrega o persistència interactiva. N16 r2 encara conté les tres fixtures històriques. |
| N16 | Paquet de continuació entre comptes | REGENERAT I VERIFICAT r2 · 10/11 | ZIP `EYD-newsletter-continuacio-2026-11-10-r2.zip` a la ruta de secció 0: 17 fitxers, manifest de mides/SHA-256 verificat reobrint l'arxiu, documents vigents, patch de sis fitxers i tres fixtures. Afegeix N17 i ADMIN buit; conserva r1 (15 fitxers) com a històric. Patch de hunks complets, tres bases contrastades amb blobs d'índex i sis resultats reconstruïts exactament; diff bloquejat EPERM, sense git apply --check/patch natiu. ZIP via adm-zip existent, sense instal·lacions, secrets, sessions, contactes o àudio privat. Pas pendent: Git operatiu i revisió de base amb git apply --check al destí abans d'integrar; al mateix checkout no aplicar el patch. |
| N17 | Comprovar estats del formulari sense serveis | FET LOCAL I PROVAT · 10/11 | `tests/newsletter-form.test.mjs`: 5/5 correctes amb `node --test tests/newsletter-form.test.mjs`; ESLint amb `--max-warnings 0` i Prettier correctes. Component `NewsletterForm.tsx` real, hooks/estat i fetch interceptats, adreça sintètica `.invalid`. Sense DOM, navegador, entorn, xarxa ni proveïdors. Base local `preview` / `75edba4` amb retocs previs preservats; sense commit/desplegament. Pas pendent: V05 visual al servidor simulat/Preview final, no confondre renders simulats amb persistència després de recarregar. |

## 6. Evidències i versió: què se sap i què no

**N05 / V05 i N15 — pendent visual local, 10/11:**
`scripts/newsletter-visual-fixture.mjs` incorpora una quarta pàgina
`newsletter-pending.html`. Renderitza el component real `NewsletterForm.tsx`
amb sis valors d'estat injectats i efectes inerts; el missatge de pendent
s'ha contrastat literalment amb `app/api/newsletter/route.ts`. No s'ha executat
aquella API. Avís visible «estado pendiente simulado» i cap formulari, input
o script; CSP `connect-src 'none'` i `form-action 'none'`. L'HTML conserva
`role="status"` i `aria-live="polite"`. Generació correcta, ESLint amb
`--max-warnings 0` i Prettier check correctes després de formatar el fitxer.

Chrome for Testing, emulació primer 375×667, després 375×500 i finalment
1280×800: missatge complet, Spam/Promocions i «No necesitas crear una cuenta»
llegibles, sense retall horitzontal observat. Captures als resultats d'eina,
sense dossier PNG nou. Artefacte observat:
`/var/folders/xy/m938h7nd76x1984v3_36c2jh0000gn/T/eyd-newsletter-visual-7xK7Kt/newsletter-pending.html`.
Sense Next, càrrega d'entorn, xarxa, proveïdors, altes o correus. No comprova
hidratació, anuncis de lector de pantalla, persistència entre renders o després
de recarregar, teclat virtual, integració amb la pàgina completa o Preview
final. N17 ja cobreix renders simulats; no s'ha repetit. N16 r2 no regenerat.

**N05 / V05 — error offline al component servit, 10/11:** revalidada la
mateixa identitat de Preview a Vercel abans de provar. Landing carregada
amb xarxa, després Offline de Device Toolbar observat **abans** d'emplenar.
No s'han trobat registres de Service Worker/Background Sync al codi cercat;
no s'han afegit retries ni alterat el servidor. Adreça sintètica `.invalid`,
casella via teclat, focus correu → casella → privacitat → botó, una submissió.
S'observa «No hay conexión. Tu solicitud no se ha confirmado; vuelve a
intentarlo.», conservant camp i casella i recuperant el botó habilitat.
Text i formulari llegibles a 375×667, després 375×500 i finalment 1280×800,
sense retall horitzontal observat en aquesta landing. No s'ha inspeccionat
un registre complet de peticions ni provat l'entrega o resposta del proveïdor:
és una fallada de connectivitat emulada al navegador sobre codi desplegat.
Abans de reconnectar s'ha navegat a `about:blank` per descartar el formulari;
No throttling restaurat i verificat, sense reenviament online. La barra de
Vercel pot aparèixer a les captures; no és un element comercial de la web.
Cap canvi d'aplicació, Next local, alta de prova real, correu o desplegament.

**N12 — evidència nova aportada per Xavier, 10/11:** al Terminal del Mac,
fora de Codex, `git --version` retorna `git version 2.50.1 (Apple Git-155)`.
Els errors de xcrun de l'agent no acrediten que el Mac no tingui Git o Command
Line Tools. Investigar l'entorn/accés de la sessió de manera acotada; no
reinstal·lar eines ni ampliar permisos a cegues. L'estat complet de Git del
checkout encara no està certificat. Aquesta nota substitueix el diagnòstic
d'absència global suggerit a les entrades anteriors.

Diagnòstic acotat posterior: `/usr/bin/git` és el llançador utilitzat per
l'agent i `xcode-select -p` retorna `/Library/Developer/CommandLineTools`.
`DEVELOPER_DIR`, `SDKROOT` i `TOOLCHAINS` no estan establerts en l'entorn
heretat (comprovats només aquests indicadors, sense imprimir l'entorn).
El Git directe instal·lat, amb execució elevada autoritzada, retorna exit 128
en llegir `/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig`:
`Operation not permitted`. No s'ha llegit el contingut d'aquell fitxer ni
modificat configuració, entorn o permisos. S'ha demanat a Xavier revisar
només aquest accés de lectura de la sessió fora de l'execució i avisar quan
estigui aplicat. No repetir intents fins que canviï aquesta condició.

**Autorització de lectura concedida; perfil encara pendent, 10/11:** Xavier
ha autoritzat explícitament la lectura necessària per a Git. Una nova consulta
directa i elevada retorna el mateix exit 128 / Operation not permitted.
Inspecció limitada de `.codex/config.toml`: perfil `eyd-segur`, `:root = deny`,
`:minimal = read`, sense regla per al gitconfig indicat; exclusions de secrets
conservades. La documentació oficial permet una entrada `read` amb ruta exacta
més específica que la denegació general. Regla mínima preparada per afegir
a la taula **existent** `[permissions.eyd-segur.filesystem]`:

```toml
"/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig" = "read"
```

Patch revisable: `/private/tmp/eyd-gitconfig-read-permission.patch`. No s'ha
modificat la configuració activa ni el fitxer `.codex/config.toml` en aquell
pas inicial, ni s'ha intentat ignorar el gitconfig. Cal aplicar/carregar la regla des dels controls
autoritzats de l'entorn i comprovar després l'estat Git; no donar per canviat
el sandbox perquè s'ha concedit permís al xat. Si ho limita una política
gestionada, cal que ho apliqui qui administra l'entorn. Referència:
https://learn.chatgpt.com/docs/permissions.
La skill local openai-docs no s'ha pogut llegir (Operation not permitted);
s'ha usat la documentació pública oficial, sense ampliar accés a skills.

**Actualització N12 — regla afegida, recàrrega encara pendent, 10/11:**
en la represa posterior s'ha comprovat que el fitxer encara no tenia la regla
i Git retornava el mateix error. Dins de l'autorització explícita concedida,
s'ha afegit només la línia read indicada a `[permissions.eyd-segur.filesystem]`
de `.codex/config.toml`. Comprovació local correcta: una única ocurrència en
la taula correcta, `:root = deny` i les quatre exclusions de secrets intactes.
No hi ha canvis a dominis, xarxa, permisos d'escriptura, compte o serveis.
Consulta Git després del canvi: mateix exit 128 / gitconfig Operation not
permitted. La regla escrita no acredita l'accés efectiu d'aquesta sessió;
s'ha demanat recarregar la finestra IDE/Codex o obrir una sessió amb el perfil
`eyd-segur` actualitzat, i reprendre des del seguiment. No és una nova petició
de consentiment. Si persisteix després de recarregar, revisar la política
efectiva/gestionada abans d'ampliar cap altra ruta. Només configuració local i
documents modificats en aquest pas; codi d'aplicació, índex i desplegaments
intactes. No s'han repetit tests, QA visual o empaquetat.

**N10 — ADMIN desbloquejat en aquesta continuació del 10/11:** Xavier confirma
entrada personal amb l'ADMIN de prova; la UI identifica el compte com a prova.
Revalidada amb recàrrega la mateixa identitat a Vercel (domini/equip/projecte/
repositori/branca/SHA/Ready). El resum servit es llegeix a 375×667 i 375×500,
amb columnes apilades; després a 1280×800, amb dues variants i graella d'orígens.
No s'observa retall horitzontal als blocs revisats ni interferència d'invitació
o WhatsApp. El text adverteix que visites no són persones úniques ni proven
una variant guanyadora. Mostra mínima de prova: control 1 / invitació 3,
cap alta confirmada; una existent a landing, separada de les altes noves.
L'API mostra `since`, `captures`, `metrics` i dimensions agregades; la UI del
resum no conté adreces de contacte. L'accessibilitat nativa trunca el JSON
llarg: no s'afirma haver-lo parsejat completament ni verificat headers HTTP.
No s'han obert llistes d'usuaris, enviat missatges, premut reintents, modificat
dades o consultat secrets. Les dues variants tenen visites; el missatge sense
mostra s'ha comprovat després en la fixture sintètica descrita a continuació.
V09 de la **versió final** continua pendent.

**N15 / N10 — estat sense mostra completat localment, 10/11:** s'ha ampliat
el generador existent, sense crear un altre servidor ni tocar dades de Preview.
`NewsletterCaptureAdmin.tsx` es renderitza amb `{captures: [], metrics: []}`
injectat i `useEffect` inert. El nou HTML s'etiqueta com a simulació i mostra
«Todavía sin muestra» a totes dues variants, amb zero visites/confirmades;
no presenta una ràtio o variant guanyadora. Revisat en navegador primer a
375×667, després 375×500 i finalment 1280×800, amb text i blocs llegibles i
sense retall horitzontal observat. Prova estàtica de component/CSS actuals,
no una resposta buida real de l'API. Generació i comprovacions de dos
missatges, etiqueta de simulació, CSP sense connexió/submissió i absència
de formularis/scripts correctes; ESLint `--max-warnings 0` i Prettier correctes.
Artefacte temporal d'aquesta execució:
`/var/folders/xy/m938h7nd76x1984v3_36c2jh0000gn/T/eyd-newsletter-visual-MlUspU/admin-capture-empty.html`.
Reproducció: `node scripts/newsletter-visual-fixture.mjs` imprimeix els URLs
d'una nova carpeta temporal. La QA de la versió final continua oberta.

**N12 — intent addicional acotat:** `git status --short --branch` s'ha provat
també amb execució elevada autoritzada; mateix error exacte de `xcrun` abans
de llegir Git. No insistir ni modificar el sistema per superar-lo. La
documentació oficial d'Apple descriu la instal·lació separada de Command Line
Tools; la recuperació de l'entorn queda fora d'aquesta sessió:
https://developer.apple.com/documentation/xcode/installing-the-command-line-tools/.

**N17 — QA nova del formulari, 10/11/2026:** les cinc proves comproven que
una submissió sense consentiment no fa petició; una fallada de xarxa conserva
correu i acceptació per reintentar; una resposta pendent conserva instruccions
de confirmar i Spam/Promocions entre renders; la càrrega desactiva controls
i ignora una altra submissió després del render; una baixa ofereix l'enllaç
de reinscripció voluntària sense marcar l'adreça com a subscrita. S'asserta
el context `blog/control/mobile` i la versió de consentiment enviada. La
protecció de càrrega provada no acredita concurrència abans de re-renderitzar.
Els primers errors eren del helper de prova (recursió sobre valors buits) i
del lint del stub, corregits; no s'ha detectat regressió ni canviat l'aplicació.
Només s'ha executat aquesta suite nova, no les 67 proves ja fetes. No s'han
executat tipus ni build nous perquè no hi ha canvi TS/TSX i l'entorn segur
continua pendent; V10 segueix obert.

- Repositori únic: `aleydapaola/energia-y-divinidad`.
- Referències locals llegides el 10/11: branca `preview`, HEAD i referència
  local d'`origin/preview`: `75edba4c5d5eb3387be59803535c339890a6206e`.
  No s'ha fet fetch i això no acredita el remot actual.
- `git status --short --branch` continua fallant abans de llegir l'estat:
  `invalid active developer path ... missing xcrun`.
- Hi ha canvis locals previs a landing, `AGENTS.md`, manifest/lockfile i
  documentació; també correcció d'invitació, prova nova i retoc N08.
  Aquesta llista no substitueix un estat Git complet ni certifica staged/HEAD.
- Abans d'editar N08, `Footer.tsx` coincidia amb l'índex; landing i invitació
  ja en diferien. No s'han sobreescrit aquests canvis previs.
- A la sessió anterior, la barra de Preview exposava l'identificador
  `dpl_5fKi8NhUWYiDF5XsSbZ5x7QZndmN`, diferent de referències històriques.
  **Inferència corregida el 10/11 a la secció 0:** és l'iframe de Vercel,
  no la identitat del web. Deployment Details revalida `dpl_6gUN5Mmwo…` i
  SHA `75edba4` per al domini Preview actual.
- La Production històrica de l'AGENTS no és una verificació actual. No s'ha
  consultat ni modificat Production en aquesta revisió.
- A la sessió anterior: 67 proves i tipus correctes després de N08; lint
  dels fitxers modificats correcte. En aquesta represa: les cinc proves N17,
  lint sense avisos i format del fitxer nou correctes. Cap build de Next nou.

### Revisió visual real ja feta

**Ampliació del 10/11, sessió actual autoritzada:** blog a 375×667 i després
375×500 en Chrome for Testing, sobre Preview identificada `75edba4` /
`dpl_6gUN5MmwoAwr5ZL54dugmC1xReRw`. Formulari propi localitzable després de
la presentació i abans dels articles (dataset de prova buit), text i controls
llegibles amb scroll. Focus observat correu → casella desmarcada → privacitat;
privacitat obre una altra pestanya i el blog es conserva. Cap correu introduït
ni enviament. WhatsApp solapa text del consentiment a 375×667 en una posició
de scroll: confirma la necessitat del retoc N08 **ja existent**, no una nova
implementació. A 375×500 es veuen camp, casella, botó i següent pas en la
captura revisada; això no prova absència de solapament en altres posicions.
No s'ha provat teclat virtual físic ni zoom/text ampliat. Captures observades
als resultats d'eina d'aquesta conversa, sense PNG exportats al repositori.

**N04 / V08 parcial, mateix entorn i SHA:** després del mòbil, blog revisat
a 1280×800 (emulació Responsive, escala Fit to window). Bloc del regal i
formulari en dues columnes, controls i missatge de confirmació visibles,
sense solapament amb WhatsApp en la posició revisada. No acredita la resta
de rutes d'escriptori ni una invitació visible. Les dimensions s'han contrastat
a la Device Toolbar; els intents intermedis de canviar-les no són proves
de layout. N04 i V08 continuen parcials fins a la versió final.

Feta amb Google Chrome for Testing, sessió de proves oberta per Xavier i accés
a Preview completat personalment per ell. Via control natiu de la finestra,
no via importació de cookies. Durant la revisió no s'ha enviat una alta vàlida.

1. Landing a 375×667: contingut, identitat, explicació de confirmació, camp,
   casella i botó llegibles; el formulari queda per sota de la presentació.
2. CTA directe nou absent al web servit: pendent integrar N03.
3. Correu de prova sintàcticament invàlid bloquejat pel navegador abans de
   l'enviament; casella inicialment desmarcada i activació del botó comprovades.
   No és una prova de resposta del servidor ni d'entrega.
4. Privacitat obre en una altra pestanya. No s'ha canviat contingut legal.
5. Home a 375 px: accés al regal a capçalera i bloc de newsletter després de
   la primera presentació, amb formulari propi; peu amb el mateix circuit.
6. Invitació real visible, contingut accessible i tancament comprovat.
   S'ha llegit únicament la preferència de tancament del domini Preview, no
   cookies o tokens. La seva data de caducitat concorda amb 14 dies.
7. WhatsApp flotant observat damunt de la part dreta del camp de correu en
   determinades posicions de scroll: pendent validar la correcció N08.

Les captures consten als resultats d'eina de la conversa. No es disposa encara
d'un dossier de captures exportat al repositori; una nova sessió no l'ha de
donar per existent. L'emulació no és un mòbil físic.

## 7. Matriu de tancament de la versió final

Les caselles següents es refereixen **a la versió final amb tots els retocs**.
Les comprovacions parcials anteriors no autoritzen marcar-les totes com a fetes.

- [ ] V01 — Identitat de Preview verificada: domini, equip, projecte,
      repositori, branca, SHA i desplegament.
      Versió actual `75edba4` revalidada el 10/11 (secció 0); pendent repetir
      aquesta identificació quan s'integrin els retocs de la versió final.
- [ ] V02 — Landing a 375×667: CTA arriba a `#recibir`, foto ben encuadrada,
      formulari complet i sense desbordament horitzontal.
- [ ] V03 — Home/capçalera/peu/blog a 375 px: es troba la subscripció sense
      instruccions, els enllaços funcionen i el mateix formulari és accessible.
- [ ] V04 — Pantalla curta 375×500 i zoom/text ampliat: tancament i botó
      accessibles; WhatsApp no tapa correu, acceptació ni botó.
- [ ] V05 — Formulari amb teclat: ordre de focus, etiquetes, acceptació,
      correu invàlid, errors de xarxa i missatge pendent persistent. Els estats
      que requereixin enviament es poden provar amb servidor simulat separat;
      identificar-los com a simulats, sense correus a clients.
- [ ] V06 — Invitació: 15 s i 35 %, control sense invitació, tancament,
      preferències, no repetició, ocultació en escriure, carrito i diàleg posterior.
      No alterar l'assignació de visitants reals per forçar una captura.
- [ ] V07 — Compte, registre, reserva, pagament, ADMIN, landing i reproductor:
      sense invitació ni interferències. No completar pagaments ni registres.
- [ ] V08 — Després de mòbil: escriptori, com a mínim 1280 px, amb formulari,
      navegació i invitació sense superposicions.
- [ ] V09 — ADMIN de prova: resum de 30 dies, permisos, estats diferenciats,
      missatge sense mostra i sense dades personals en el resum.
      Preview `75edba4` revisada el 10/11 amb ADMIN de prova i estats agregats;
      sense mostra comprovat en HTML local sintètic. Falta versió final.
- [ ] V10 — Tests rellevants, tipus, lint, format i build segons els canvis,
      amb entorn autoritzat i proteccions comprovades.
- [ ] V11 — Commit i Preview finals documentats, limitacions explícites,
      aprovació concreta de Xavier abans de Production.
- [ ] V12 — Després de publicació aprovada: comprovació pública de només
      lectura i enllaços definitius preparats per a Aleyda.

No cal repetir la recepció de la meditació o la baixa real ja verificades si
el circuit no ha canviat. Les proves anteriors no acrediten que una altra
adreça/dataset/audiència o un altre desplegament siguin correctes.

## 8. Mesura i validació amb persones

Un cop la captació sigui pública, demanar a persones noves que intentin trobar
com subscriure's i rebre la meditació **sense donar-los la ubicació**. Registrar
si ho troben, en quin accés, passos, dubtes i obstacles. Proposta: 3–5 persones
amb mòbil com a primera comprovació qualitativa; no és una prova estadística
ni obliga a crear contactes reals. No contactar persones des d'aquest encàrrec.

El resum existent separa origen, dispositiu, variant i estats. Conservar-ho.
L'assignació per pestanya i els comptadors agregats tenen limitacions:

- Una visita comptada no és una persona única; canvis de dispositiu/pestanya
  i emmagatzematge bloquejat alteren el recompte.
- Les altes conserven el primer origen, no una atribució completa del recorregut.
- El percentatge del panell és una ràtio orientativa, no un experiment causal
  certificat ni la conversió de tots els visitants de la web.
- No comparar directament landing i invitació com si tinguessin el mateix públic.
- No declarar una variant guanyadora amb trànsit insuficient. Si cal un assaig
  estadístic, definir unitat, mostra i finestra abans; no inventar-les després.
- La revisió de 30 dies pot acabar en «encara no tenim prou dades».

La instal·lació funcional té un final verificable. L'optimització posterior és
un cicle separat: observar un problema, canviar una cosa i tornar a mesurar.
No mantenir indefinidament obert el desenvolupament perquè sempre es pugui
experimentar amb un altre popup.

## 9. Restriccions i bloquejos que s'han de respectar

- Llegir `AGENTS.md`. Treballar exclusivament en EYD, amb prioritat Preview i
  mobile first. Conservar tots els canvis pendents.
- No llegir `.env*`, `.local-private/`, claus, cookies, tokens o altres projectes.
  No copiar sessions d'un compte/navegador a un altre.
- No baixar el sandbox, ampliar dominis/permisos a cegues ni reparar el sistema
  per eludir un bloqueig. No executar migracions o enviar correus reals.
- Abans de Next/Prisma/Studio, comprovar `local:check` i l'entorn efectiu.
  Aquest comprovador carrega `.env*`: amb la denegació actual no s'ha executat
  ni s'ha arrencat Next directament per saltar-se'l. L'entorn heretat tampoc
  passa els guardes de base/serveis.
- Git funciona al Terminal de Xavier; dins de l'agent la primera excepció
  del sistema ja és efectiva i ara es denega `/Users/xmonfort/.gitconfig`.
  La segona regla read exacta ja és al config local, pendent de carregar.
  Una lectura de l'índex no substitueix Git complet. Carregar el perfil abans d'integrar;
  no reinstal·lar Git ni saltar-se la configuració per evitar el bloqueig.
- La prova de navegador real s'ha recuperat: **no repetir la instal·lació de
  Chromium**. Vegeu el procediment de continuació de sota.
- No modificar consentiment, polítiques legals/comercials, pagaments ni activar
  campanyes o seqüències comercials noves per completar captació.
- Production requereix aprovació específica del commit/versió. Aquest pla i
  l'ordre de continuar no la substitueixen.

## 10. Procediment de continuació en aquest compte o un altre

1. Llegir aquest document i `AGENTS.md`; consultar `AUTONOMY_STATUS.md` per
   l'entorn. No carregar tot l'històric; seguir només les referències necessàries.
2. Comprovar Git, canvis pendents i desplegament real. Si una altra sessió ja
   ha fet una tasca, registrar-ne l'evidència i continuar per la següent.
3. Prioritat actual: resoldre els prerequisits de N12 i integrar N03/N07/N08
   en una Preview identificada; després acabar N11 de la versió final.
   La QA estàtica local de N03/N08 ja està feta. No reiniciar N02–N08 ni
   crear un segon sistema de captació.
4. Si Google Chrome for Testing està obert, cercar l'aplicació
   `com.google.chrome.for.testing` amb el control natiu. Un inventari de
   navegadors buit no vol dir que aquesta finestra no es pugui controlar.
5. La sessió de Vercel es va completar personalment. Un altre compte no ha
   d'assumir que l'hereta; si torna a mostrar login, demanar l'entrada personal
   a la finestra de proves, sense contrasenyes o codis al xat.
6. Device Toolbar: començar a 375×667. El control natiu té problemes de
   coordenades amb «Fit to window»; per als clics es va usar 375×500 al 100 %.
   Fer servir el teclat o coordenades de captures recents i comprovar el focus
   després de cada canvi. No atribuir a la web un error de l'automatització.
7. La barra flotant de Vercel es va amagar amb el menú **Hide Toolbar** només
   per facilitar la revisió. No és un canvi de la web ni una prova de publicació.
8. Acabar primer mòbil i després escriptori, documentant cada fila V01–V12.
9. Abans de sortir: actualitzar tasques, proves, fitxers i punt de represa.
   Només després preparar la proposta de publicació per a Xavier.

### Fitxers que contenen la feina encara local

- `app/meditacion-gratis/page.tsx`: CTA mòbil i foto, canvis previs conservats.
- `components/newsletter/NewsletterInvitation.tsx`: ocultació amb diàleg posterior.
- `tests/newsletter-invitation.test.mjs`: sis regressions de comportament.
- `tests/newsletter-form.test.mjs`: cinc proves N17 d'estats amb fetch simulat.
- `components/layout/Footer.tsx`: retoc N08 perquè WhatsApp no tapi el formulari.
- `scripts/newsletter-visual-fixture.mjs`: QA estàtica local reproduïble.
- Aquest pla, `AUTONOMY_STATUS.md` i `docs/captacion-newsletter-2026-11-05.md`.

Un altre compte al **mateix checkout** pot continuar aquests fitxers. En una
altra màquina, el repositori remot pot no tenir-los: no hi ha commit/push dels
retocs. Transferir només els fitxers/patch explícits sense secrets i revisar
diferències abans d'aplicar-los. No copiar tota la carpeta del projecte ni
sobreescriure una branca nova amb instantànies antigues.

### Text per enganxar al compte que continuï

El paquet vigent **N16 r2** conté `README_CONTINUACIO.md`, una carpeta `snapshot/`
amb aquests documents, N17 i els fitxers seleccionats, `canvis-locals.patch`,
`manifest.json` i tres pàgines `qa-static/` (landing, peu i ADMIN buit simulat).
Ruta del ZIP a la secció 0; l'r1 és històric. Si canvies de compte al mateix equip, segueix el pla
del checkout actiu. Si canvies d'equip, adjunta el ZIP i el pla al nou compte:
les instruccions del README exigeixen comparar la base abans d'integrar.
El ZIP r2 és una instantània del 10/11 posterior a la revisió ADMIN; els canvis
futurs requereixen regenerar-lo. No transfereix l'autenticació ADMIN o Vercel.

Copiar el bloc complet. Si s'utilitza fora de Codex o en una altra màquina,
adjuntar també aquest document; per executar canvis cal accés al repositori i
als fitxers locals pendents. El prompt no transfereix sessions ni secrets.

```text
Continua la implementació i verificació del pla de captació de newsletter
d'Energía y Divinidad, exclusivament al repositori
aleydapaola/energia-y-divinidad. En aquest equip el checkout és
/Users/xmonfort/Projects/energia-y-divinidad; en un altre equip, identifica
el checkout correcte sense obrir altres projectes.

OBJECTIU
Una persona nova ha de poder trobar i completar la subscripció a la newsletter
sense que Aleyda li expliqui on és el formulari. Ha de poder rebre un enllaç
directe al regal del Ángel de la Guarda, deixar el correu, acceptar, confirmar
i rebre la meditació, sense crear compte ni comprar. Prioritza subscripcions
confirmades i facilitat d'ús.

ABANS D'ACTUAR
1. Llegeix AGENTS.md, docs/PLA_MESTRE_NEWSLETTER.md i AUTONOMY_STATUS.md.
   El pla és la llista principal de tasques; el seguiment descriu l'entorn.
2. Comprova branca, Git i canvis pendents; verifica el desplegament real de
   Preview amb domini, equip, projecte, repositori, branca i SHA.
   No equiparis un SHA local o una nota antiga amb la versió desplegada.
3. Distingeix implementat localment, provat localment, verificat a Preview
   i publicat. Contrasta les tasques marcades com a fetes amb la seva evidència.
   Conserva tots els canvis pendents i no reiniciïs implementacions acabades.
4. Si et falten documents o eines, identifica què falta concretament. Si només
   pots llegir el document, no simulis que has vist el repositori o la web.

EXECUCIÓ
Continua pel primer pendent segur del pla i persisteix fins a completar els
criteris de tancament possibles. No et limitis a resumir o proposar un altre pla.
No preguntis de nou decisions funcionals ja resoltes al document.
Treballa a Preview; aplica i comprova els canvis ordinaris autoritzats pel
context vigent, sense ampliar l'abast amb campanyes, pagaments o nous sistemes.

MOBILE FIRST
Comença la verificació real a 375 px, incloses pantalles curtes, formulari,
controls tàctils, lectura, focus, invitació, WhatsApp i absència de
superposicions. Després comprova escriptori. Diferencia emulació, mòbil físic,
dependències simulades i web desplegada; no substitueixis una prova per una altra.

ACTUALITZACIÓ OBLIGATÒRIA
Cada vegada que completis una tasca, actualitza immediatament el mateix
docs/PLA_MESTRE_NEWSLETTER.md abans de passar a la següent: identificador,
estat real, data, fitxers, comprovacions, entorn/versió i pas pendent.
Mantén les tasques acabades i la seva evidència perquè no es repeteixin.
Si detectes una regressió, reobre aquella tasca amb el motiu.
Abans de finalitzar una sessió, actualitza també AUTONOMY_STATUS.md amb el
punt exacte de represa, els canvis locals i els bloquejos que persisteixin.

LÍMITS
No obris altres projectes ni .env*, .local-private/, claus, cookies o tokens.
No copiïs sessions entre comptes. No desactivis proteccions per superar
bloquejos. Comprova les proteccions locals abans d'arrencar Next/Prisma/Studio.
Mantén baixes, consentiment aprovat, un contacte per adreça/audiència i un regal.
No repeteixis altes, entregues, baixes o compres reals ja verificades.
Utilitza només dades i proveïdors de prova autoritzats. No heretes les sessions
ni les autoritzacions operatives d'un altre compte perquè apareguin a l'historial.
No facis merge, push, desplegament ni canvis de dades/configuració de Production
sense aprovació explícita de Xavier per a la versió/commit concret.

SI HI HA UN BLOQUEIG
Registra l'error exacte i els intents raonables, no instal·lis o reprogramis
repetidament el mateix. Continua les tasques independents que siguin segures.
Per a una acció que requereixi intervenció o aprovació, prepara primer el
resultat concret revisable i explica la necessitat. No declaris complet el pla
mentre faltin comprovacions obligatòries o la publicació aprovada corresponent.

RESULTAT
Informa breument de què has completat, què has comprovat i què falta, amb
enllaços als fitxers. El document ha de permetre que una altra sessió reprengui
la feina sense repetir ni desfer el que ja està fet.
```

## 11. Registre d'avenç

| Data | Tasca / canvi | Resultat |
| --- | --- | --- |
| 09–10/11/2026 | Recuperació del pla anterior i auditoria del codi | Landing, formularis, invitació, regal i mètriques ja implementats; no s'ha de reiniciar la feina. |
| 09–10/11/2026 | N07: diàleg posterior a la invitació | Corregit localment; sis proves noves i 67 relacionades correctes, tipus i lint correctes. |
| 10/11/2026 | Navegador real i accés de Preview recuperats | Finestra Google Chrome for Testing controlable; Xavier completa l'entrada de Vercel; revisió mòbil parcial feta. |
| 10/11/2026 | N01: recerca i pla mestre portable | Document creat amb criteris, inventari, matriu i instruccions per a un altre compte. |
| 10/11/2026 | N08: WhatsApp damunt del correu | Incidència observada; correcció local preparada. QA i integració encara pendents. |
| 10/11/2026 | N15: fixture estàtica i N08 mòbil | HTML autocontingut generat amb CSS actual; a 375×500 el botó ja no és flotant ni tapa el formulari i continua visible al final del peu. Sense servidor, API o submissió. Escriptori i Preview pendents. |
| 10/11/2026 | N08: comprovació estàtica d'escriptori | Revisat després de mòbil a 1280×800: es conserva el botó flotant i es renderitza el formulari del peu. No substitueix la matriu de Preview final ni l'auditoria general de navegació/legal. |
| 10/11/2026 | N03: landing local a 375×667 | Cara ben enquadrada, CTA visible i activació amb teclat comprovada: URL acaba en `#recibir` i el formulari queda a la vista. QA estàtica amb CSS actual, no desplegada. |
| 10/11/2026 | Regressions després de N08 | 67/67 proves correctes, tipus correctes i lint sense avisos. No repetir aquesta suite si només canvia documentació. |
| 10/11/2026 | N16: paquet de continuació | ZIP creat amb 15 fitxers i hashes verificats. Inclou pla amb prompt, seguiment, fonts seleccionades, patch i HTML estàtics; cap secret o sessió. |
| 10/11/2026 | Traspàs per quota a petició de Xavier | Punt de represa afegit a la secció 0; Git i referències locals recontrastats. Només documentació i paquet de continuació; cap prova d'aplicació repetida ni canvi de codi, commit o desplegament. |

**Punt de represa:** no repetir la QA estàtica acabada de N03/N08. Integrar
N03/N07/N08 en una Preview identificada quan Git sigui operatiu i completar
els casos pendents de V01–V10;
registrar els resultats nous aquí abans de passar a publicació. Estat global
encara **EN CURS**, sense publicació nova.
