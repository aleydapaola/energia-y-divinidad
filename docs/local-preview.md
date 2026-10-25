# Desarrollo local de Energía y Divinidad

Trabajar en `preview`. `main` se publica solo tras aprobar una versión concreta.

## Configuración de este equipo

Los archivos activos `.env` y `.env.local` ya no contienen las credenciales reales anteriores.
Los originales se conservan en `.local-private/original-env-2026-10-19/`, con permisos privados,
fuera de Git y de los archivos que cargan Next y Prisma. No restaurarlos sobre los archivos activos.

El perfil local usa exclusivamente:

- La base Neon Preview verificada de Aleyda, con su conexión propia.
- Un secreto de sesión local independiente y direcciones `http://localhost:3000`.
- El proyecto Sanity `81jpalr2`, dataset `preview`, para lectura y edición autenticada en Studio.
- La dirección de prueba `aleydapaola@proton.me` como límite de destinatarios.

No contiene claves de pagos, Resend, Mailchimp, Google Calendar, Google OAuth ni escritura mediante
API de Sanity. Esos servicios quedan desactivados localmente. Sus pruebas de integración se hacen en
Vercel Preview con claves dedicadas; no copiar las claves reales del respaldo al entorno local.
Los pagos se han retomado en Vercel Preview por petición de Xavier y Aleyda: PayPal sandbox
y Bre-B simulado. El entorno local conserva las claves externas desactivadas.

## Arranque

1. Ejecutar `npm run local:check`.
2. Ejecutar `npm run dev` y abrir `http://localhost:3000`.
3. Para editar contenidos, abrir `/studio`, o ejecutar `npm run sanity` para el editor independiente.

El arranque local y la ruta de autenticación se han comprobado (HTTP 200). La vigilancia de archivos
usa consultas periódicas para evitar agotar los observadores nativos cuando hay otros proyectos abiertos.

Los comandos npm protegidos cargan el mismo entorno para Next, Prisma y Studio. Comprueban el servidor
Neon, proyecto y dataset Sanity, direcciones locales y ausencia de claves externas. También detectan
claves heredadas del terminal. Si el arranque se bloquea, corregir el entorno; no ejecutar las
herramientas directamente para eludir la comprobación.

El editor distingue «PRUEBAS — NO REAL» de «CONTENIDO REAL». Los comandos CLI de Sanity tienen por
defecto el dataset y el nombre de alojamiento de pruebas. No desplegar un Studio independiente ni
cambiar permisos de Sanity sin revisar el destino.

## Estado de los contenidos

El dataset público `81jpalr2/preview` está creado y verificado: 198 documentos de contenido
publicado y 187 archivos e imágenes copiados al propio dataset de pruebas. No incluye borradores,
cupones ni documentos marcados como no publicados. No introducir datos personales en este espacio público.

Una modificación de prueba y su retirada se verificaron en Preview sin modificar ninguna revisión
de los documentos de producción. Todas las referencias se resuelven y los archivos apuntan a Preview.
El editor permite el origen local y la dirección estable de Vercel Preview, con inicio de sesión de Sanity.
No se ha copiado ninguna clave de escritura del CMS a Vercel Preview.

## Publicación

Publicar código y publicar contenidos son operaciones distintas. Una integración de la rama Git no
copia el dataset de Sanity. Los cambios de contenido deben revisarse en Preview y trasladarse de forma
selectiva a producción después de la aprobación, conservando una copia de los documentos originales.
No importar todo el dataset de pruebas sobre producción ni copiar reservas, compras o credenciales.

`npm run test:preview` utiliza dependencias simuladas y no hace pagos ni conecta a servicios externos.
