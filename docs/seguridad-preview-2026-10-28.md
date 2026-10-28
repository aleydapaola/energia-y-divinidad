# Corrección de dependencias — solo Preview

Base verificada: 290d694255f13a1cbd748eb4f5268471f57bcfc7, rama preview. Production permanece en 7b9a7ac3f8ee65ea6f7e80a9cc7460a62c0c17cd y no se ha autorizado publicar esta actualización.

## Cambios preparados

- Next.js 15.5.28, Auth.js 5.0.0-beta.32 y adaptador Prisma 2.11.3. React y React DOM 19.3.1. Se conserva Next 15 y la configuración de autenticación existente.
- Sharp 0.35.5 y PostCSS 8.5.32 fijados para evitar conservar copias vulnerables del archivo de versiones anterior. Actualizaciones compatibles de paquetes transitivos; no se usa audit fix --force.
- Migración documentada del CMS: Sanity 3→4.22.1 y next-sanity 11, compatible con Next 15 y React 19. No cambia dataset, esquemas de contenido ni permisos. No se ejecutan importaciones, ediciones o despliegues del Studio independiente.
- Prisma permanece en la versión mayor 6, con actualización a 6.19.3 de cliente y herramientas. Sin migraciones nuevas de base de datos.
- Zod 4.6.7: adaptación de la validación antigua a issues y a record con claves explícitas. Las validaciones de compra y la política comercial se conservan.

## Copia antigua de dependencias del Studio

Había 53.201 archivos de sanity/node_modules versionados, a pesar de que esa ruta ya figuraba en .gitignore. La web resolvía parte del CMS desde esa copia y otra parte desde el archivo de versiones principal. Esto causó un conflicto de tipos al actualizar y dejaba paquetes antiguos fuera de la auditoría principal.

Se retira esa copia del árbol versionado. Antes de retirarla se conserva íntegramente en .local-private/dependency-backups-2026-10-28/sanity-node_modules, ignorado por Git. También es recuperable desde el historial anterior. No se han borrado datos del CMS ni configuración de cuentas. El Studio independiente conserva sus manifiestos, actualizados para Sanity 4; la aplicación instala sus paquetes desde la raíz.

## Comprobaciones y límites

Auditoría inicial de dependencias de producción: 66 entradas (6 critical, 35 high, 24 moderate, 1 low). El conteo incluye dependencias directas y transitivas y no demuestra por sí solo explotabilidad en esta aplicación. Se conservan informes JSON privados de cada etapa.

Pruebas nuevas contra bibliotecas instaladas, sin servicios externos: sesión JWT válida y alterada, tokens Bearer malformados, autorización ante errores de configuración e imagen SVG convertida con Sharp. La configuración propia ya comprueba auth.user y no acepta un objeto de error como sesión.

Resultado local final: compilación completa Next 15.5.28 correcta (135 páginas), 147 pruebas correctas, tipos y lint correctos, extracción completa de esquema Sanity 4 correcta y prueba real de inventario con Prisma 6.19.3 en Neon Preview correcta. Solo se retiraron las fixtures efímeras de esa prueba, sin clientes de pago/correo/calendario. Las ocho compras ficticias previas son evidencia histórica; no equivalen a repetir capturas con estas dependencias. No crear pagos adicionales ni automatizar devoluciones para validar esta actualización.

## Compatibilidad de compilación

El primer despliegue f2c93a0e falló porque next.config.ts fijaba sanity/structure a un archivo interno .mjs de la versión antigua. El alias ahora usa la entrada pública resuelta por Node, sin fijar esa extensión. La compilación local adicional detectó imports de useEffectEvent de Sanity 5 que este build de Next 15 no exportaba; se conserva Sanity 4, cuya compilación completa se ha comprobado. No se fuerza una migración de Next 16 para esta corrección.

## Avisos residuales

La auditoría final de dependencias de producción pasa de 66 entradas y 6 critical a **9 entradas: 0 critical, 9 high y 0 moderate**. El informe privado definitivo es .local-private/preview-qa-2026-10-27/dependency-audit-final-cms4.json. Las etiquetas incluyen la propagación de un mismo aviso a sus paquetes dependientes; no son once fallos independientes demostrados en la web.

Los avisos restantes se originan en herramientas de configuración/CLI: deepmerge-ts en Prisma 6; adm-zip y la copia de Zod utilizada por las herramientas de Sanity. No se han forzado versiones mayores de esas dependencias fuera de sus rangos. Su corrección requiere revisar por separado la migración de Prisma o del CLI del CMS y validar sus comandos de importación/extracción. No se considera una auditoría de seguridad completa ni se declara la web libre de vulnerabilidades.

La verificación remota del candidato se registrará en .local-private/preview-qa-2026-10-27/security-deployment-verification-2026-10-28.json, con SHA/despliegue, rutas y límites. No publicar Production sin aprobación concreta posterior.

## Fuentes primarias consultadas

- [Corrección de imágenes en Next.js](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- [Errores de configuración en Auth.js](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3).
- [Normalización de email en Auth.js](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-7rqj-j65f-68wh). La aplicación utiliza Credentials, no el proveedor de magic links descrito en ese aviso.
- [Sanity 3 a 4](https://www.sanity.io/docs/help/v3-to-v4), [Sanity 4 a 5](https://www.sanity.io/docs/help/v4-to-v5) y [compatibilidad de versiones](https://www.sanity.io/docs/help/upgrade-packages).
- [Migración de Zod 4](https://zod.dev/v4/changelog).
