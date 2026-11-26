# Carret de productes digitals

- Objectiu: una comanda i un pagament per diversos productes digitals, amb drets individuals.
- Worktree: `../energia-y-divinidad-carret`, branca `feat/carret-digital`, base `00750a247d0499cb57f100186516c23fd22dead0`. GitHub retornava aquest SHA per a main i preview. Canvis del carret pendents de commit. Checkout original preservat.
- Implementat: magatzem Zustand de productes digitals amb clau local pròpia, eliminació i deduplicació per ID. Funció d'intersecció de mètodes de pagament. Encara sense connexió a la interfície.
- Verificat: prova Node de mètodes comuns i `git diff --check`. Pendent: resta de proves funcionals, tipus, lint, build, mòbil i escriptori. El worktree no té dependències instal·lades.
- Migracions: cap. Preview del carret: cap. Entorns i serveis de prova encara pendents de verificació.
- Represa: revisar `lib/checkout/one-time-checkout.ts`, `lib/payment-processor.ts` i `lib/digital-products/drive-delivery.ts` conjuntament amb el model Prisma. Definir una línia immutable per producte i una entrega per línia, amb lectura compatible dels registres antics. Incorporar la validació del catàleg, propietat i Concurrència abans de connectar el carret al pagament. La relació Drive actual és única per comanda. Revisar també revocació, recuperació d'arxius fora de catàleg, reintents i accés per titular.
- Publicació: verificar desplegament base i aïllament, aplicar la migració additiva a Preview, completar QA de pagament i entrega amb serveis de prova, i esperar aprovació de Xavier del SHA concret abans de publicar a Production.
