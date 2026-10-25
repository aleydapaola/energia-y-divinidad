# Pla de feina pendent de Preview

Actualitzat el 25/10/2026. URL: https://preview.energiaydivinidad.com. Treball només a `preview`; producció requereix aprovar una versió concreta. L'accés de Vercel es manté.

| Ordre | Tasca | Execució i criteri de tancament | Dependència |
| --- | --- | --- | --- |
| 1 | Tancar l'API antiga de reserves | Correcció en curs: consulta amb sessió i propietat o ADMIN; retirar la creació antiga que acceptava imports del navegador. Proves locals i comprovació remota abans de donar-la per tancada. | Cap per preparar i provar Preview |
| 2 | Preus i newsletter de proves | Preparat: checkout utilitza la mateixa projecció de preus del CMS que les fitxes; newsletter sense compte de proves retorna indisponibilitat sense cap alta. Desplegar i verificar. | Cap per aquesta preparació; Mailchimp separat per activar enviaments |
| 3 | Disponibilitat i concurrència de sessions | Revisió iniciada: la reprogramació encara no valida la franja contra la disponibilitat i el calendari compara inicis en lloc de tots els solapaments. Cal unificar horaris, durades, marges, festius i validació al servidor; protegir canvis simultanis i comprovar que els límits de dos canvis i 24 hores es mantenen. No considerar-ho validat per les proves horàries anteriors. | Implementació i proves específiques abans de proposar Production |
| 4 | Preparar continguts i administració de proves | Inventari de Neon Preview: un usuari USER i cap ADMIN. Al catàleg, els cursos estan marcats com a privats i tots els esdeveniments són passats. Preparar un curs i un esdeveniment sintètics, clarament identificats, exclusivament al dataset preview; no obrir cursos privats ni canviar dates d'esdeveniments reals. | Autorització específica per crear un compte ADMIN dedicat; contrasenya introduïda per l'usuari |
| 5 | Completar la matriu de compres | Quatre tipus de compra × PayPal sandbox/Bre-B simulat. Verificar captura o confirmació, entrega única, permisos, correu Delivered i calendari de sessions. Iniciar un pagament o retornar 200 no acredita entrega. | Comprador sandbox, ADMIN de proves i continguts sintètics; mai pagaments reals |
| 6 | Newsletter real de proves | Completar activació/accés de Mailchimp separat, verificar audiència pròpia, desar clau només a Preview i comprovar alta amb doble confirmació i baixa. | Compte Mailchimp separat; no reutilitzar l'audiència real |
| 7 | Revisió visual i legal | Recórrer compte, compra i panell amb sessió i en mòbil. Completar dades fiscals i adreça pública, condicions particulars, autoritzacions i terminis dels borradors. | Dades d'Aleyda i revisió dels textos |
| 8 | Preparació de publicació | Confirmar dades reals de Global66, repassar la versió concreta i conservar referència de retorn. | Aprovació explícita posterior; aquest pla no publica producció |

## Preparació concreta del compte ADMIN

Es proposa un compte nou i separat del client fictici, identificat com a administració de proves, només a Neon Preview. No s'eleva el rol del compte existent. Cap compte ni permís de Production es modifica. Tots els correus continuen limitats a aleydapaola@proton.me. La contrasenya la defineix l'usuari, fora del xat i del repositori.

Crear aquest accés administratiu requereix autorització específica. Aquest pla deixa preparada la decisió; no ha creat cap compte ni credencial.

## Editor Sanity

El Studio continua accessible des de la URL tècnica de Preview ja autoritzada. Afegir CORS amb credencials per al subdomini continua pendent de l'aprovació concreta demanada anteriorment; no és necessari per navegar per la web ni per continuar les correccions de codi.

El registre anterior i la matriu detallada es conserven a [plan-preview-2026-10-25.md](plan-preview-2026-10-25.md) i [matriz-pruebas-preview.md](matriz-pruebas-preview.md).
