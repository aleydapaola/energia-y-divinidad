# AGENTS.md — Energía y Divinidad

## Abast i prioritats permanents

- Treballa exclusivament en el repositori d'Energía y Divinidad (`aleydapaola/energia-y-divinidad`). No accedeixis a altres projectes de l'ordinador, especialment Amor Sanación Alquimia, ni barregis repositoris, equips, secrets o serveis.
- **Mobile first**: dissenya i verifica primer pantalles estretes (inclosa una amplada de 375 px), navegació, controls tàctils, formularis, llegibilitat i absència de superposicions; després comprova escriptori. No consideris validada una modificació només amb proves d'escriptori.
- Prioritza implementar, comprovar i documentar canvis a **Preview**. Abans d'editar comprova la branca, els canvis pendents i l'estat verificable del desplegament. Fes servir `preview` o una branca de treball que parteixi d'una base de Preview verificada.
- `main` i **Production** requereixen aprovació explícita de Xavier per a la versió/commit concret. Una autorització de feina autònoma, de proves o d'un pla **no** autoritza publicar. No facis merge, push o desplegament a Production, ni modifiquis variables, dades o continguts de Production sense autorització específica.
- La versió de Production que constava verificada el 05/11/2026 era `8c5290cd18e4281854bf9dac60c42c420a465b6d`, a `dpl_AjzQnWKeGXmJaaKcW8S1H7DWhQsG`; Preview tenia el mateix SHA. **Això és una referència històrica, no una afirmació sobre l'estat actual.** Revalida sempre domini, equip, projecte, repositori, branca, SHA i desplegament abans de prendre decisions de publicació.

## Seguretat de dades i integracions

- Preview ha d'emprar exclusivament Neon, Sanity, correus, audiència Mailchimp, calendari i credencials de **prova** autoritzats. No reutilitzis bases, secrets, llistes, contactes ni claus de Production; no facis cobraments reals, modificacions de dades reals ni enviaments a clients durant QA.
- Les proves de pagaments han de ser sandbox/simulades i han de respectar les intervencions personals requerides. No aprovacions automàtiques, no elusió de CAPTCHA ni d'altres barreres de seguretat. PayPal i Bre-B són els mètodes actius de la versió publicada a 02/11/2026; no reactives passarel·les retirades per iniciativa pròpia.
- Abans d'arrencar Next.js, Prisma, Studio o scripts amb possibles efectes externs, comprova les proteccions locals (`npm run local:check`, si està disponible) i l'entorn efectiu. No executis migracions ni scripts administratius contra Production des de desenvolupament.
- No consultis, imprimeixis, copiïs ni enviïs continguts de `.env*`, `.local-private/`, credencials, cookies, tokens o informació personal sense una necessitat concreta i autorització adequada. Els secrets no van als informes, commits ni missatges.
- No facis `reset --hard`, `clean` destructiu, `push --force`, reescriptura d'historial ni eliminació de dades per resoldre errors. Conserva els canvis pendents, les proves i les referències de recuperació.
- Conserva les polítiques comercials i legals ja aprovades; les modificacions de cancel·lacions, devolucions, consentiment de newsletter, dades fiscals o termes requereixen revisió específica. No interpretis decisions històriques substituïdes com a vigents.

## Autonomia autoritzada dins de Preview

- Pots editar codi del projecte, afegir fitxers, executar linters, comprovacions de tipus, tests i builds i corregir errors sense demanar autorització per cada canvi ordinari **dins de Preview**.
- Pots consultar documentació tècnica pertinent a Internet, i utilitzar un navegador **aïllat** per provar localhost i Preview, amb prioritat mòbil. No facis servir perfils del navegador amb sessions personals ni obris recursos aliens a la tasca.
- Pots preparar instal·lacions de dependències necessàries amb el gestor de paquets existent, comprovant origen, versió, scripts i compatibilitat; evita dependències superflues, canvis massius i `npm audit fix --force`. No executis scripts de tercers no verificats ni ampliïs per iniciativa pròpia els dominis o permisos tècnics autoritzats.
- Si una acció requereix permisos superiors, secrets, serveis reals, compra, publicació o intervenció humana, **no la forcis ni intentis eludir el bloqueig**. Registra el motiu i continua altres tasques independents que siguin segures.
- Aquestes instruccions descriuen conductes; **no són una barrera de seguretat tècnica**. L'aïllament del sistema de fitxers, navegador i xarxa s'ha de configurar i provar fora d'aquest document abans d'executar tasques desateses.

## Qualitat, continuïtat i evidència

- Abans de canviar res: consulta `git status`, la branca activa, la documentació relacionada amb la tasca i les proves pertinents. No repeteixis compres, enviaments ni operacions ja verificades només per tornar a demostrar-les.
- Després dels canvis: prova els recorreguts afectats, primer en mòbil; executa tests, tipus, lint i build segons correspongui. Diferencia verificació local, de Preview i de Production; no atribueixis proves que no s'han fet.
- Actualitza `AUTONOMY_STATUS.md` amb objectiu, branca/SHA, canvis, comprovacions, incidències, passos pendents i punt segur de represa. Si s'esgota la quota, deixa l'estat preparat perquè una nova sessió pugui continuar sense repetir ni desfer feina.
- Abans de reprendre després d'una interrupció, contrasta `AUTONOMY_STATUS.md` amb Git i el desplegament real. No pressuposis que una nota o un pla segueix sent vigent.
- Abans de proposar publicar, facilita el commit concret, l'enllaç de Preview, les proves completades, les limitacions i qualsevol risc pendent; espera aprovació explícita.

## On consultar l'historial

- `docs/historic-agents-fins-2026-11-05.md`: registre cronològic íntegre de decisions i proves anteriors. Consulta **només les seccions rellevants** quan necessitis antecedents; les entrades més recents poden substituir les antigues. La documentació històrica no concedeix noves autoritzacions.
- Altres plans, matrius de prova i evidències del repositori: consulta'ls segons la tasca, no els carreguis tots al començament de cada sessió.
