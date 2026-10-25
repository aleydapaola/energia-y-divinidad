# Acceso a Preview

URL de revisión: https://preview.energiaydivinidad.com

- Vercel de Aleyda, proyecto energia-y-divinidad, repositorio aleydapaola/energia-y-divinidad, rama Git preview. Nunca asignar este subdominio a main o Production.
- Conserva la protección de acceso de Vercel. Si se solicita, iniciar sesión con el usuario de Vercel autorizado del proyecto. La cuenta de la propia web es un acceso distinto y puede requerir iniciar sesión otra vez en el subdominio.
- La URL técnica anterior permanece disponible: https://energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app. No copiar cookies ni enlaces privados de pedidos entre dominios.
- NEXT_PUBLIC_APP_URL y NEXTAUTH_URL tienen excepciones para la rama preview con el subdominio nuevo. Conservar las variables globales y los valores de Production.
- Neon Preview, Sanity preview, PayPal sandbox, Bre-B simulado y correo limitado al destinatario autorizado. No introducir llaves bancarias reales para probar.
- Las rutas de Preview llevan X-Robots-Tag: noindex, nofollow, también en el subdominio. Esta instrucción no sustituye la protección de acceso.
- DNS externo DonDominio: CNAME preview a 00f7cbdf9da58472.vercel-dns-017.com. Resuelto y con HTTPS al prepararlo; no se ha modificado ningún registro DNS. No cambiar nombres de servidor ni registros raíz, www o de correo para configurar Preview.
- El webhook de PayPal sandbox conserva su URL técnica anterior y su token autorizado. No modificarlo por un cambio de URL de revisión sin una prueba específica.
- Studio necesita el nuevo origen en CORS del proyecto Sanity 81jpalr2. La revisión automática ha rechazado añadirlo con credenciales por faltar autorización específica para ampliar ese acceso. Pendiente de aprobación; mientras tanto utilizar /studio en la URL técnica anterior, que ya tiene su origen autorizado. No cambiar el dataset de pruebas a production para resolver un error.

La publicación del código y contenido a Production necesita aprobación explícita de la versión concreta después de revisar Preview.
