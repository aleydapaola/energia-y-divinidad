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
Los pagos están aparcados por decisión de Xavier y Aleyda.

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

La configuración local está preparada para `preview`, pero su creación remota sigue pendiente de
la autorización explícita sobre lectura pública. Hasta crear y copiar ese dataset, no considerar
validada la carga de páginas con contenidos ni la edición real. El control de base de datos y una
consulta de lectura a Neon Preview sí se han verificado.

## Publicación

Publicar código y publicar contenidos son operaciones distintas. Una integración de la rama Git no
copia el dataset de Sanity. Los cambios de contenido deben revisarse en Preview y trasladarse de forma
selectiva a producción después de la aprobación, conservando una copia de los documentos originales.
No importar todo el dataset de pruebas sobre producción ni copiar reservas, compras o credenciales.

`npm run test:preview` utiliza dependencias simuladas y no hace pagos ni conecta a servicios externos.
