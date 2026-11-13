# Productos digitales · entrega independiente de Academia

## Diseño y compatibilidad

- Se conserva `_type: product`, IDs, slugs, precios `price`/`priceUSD`, filtros de estado, órdenes y entitlements `PRODUCT`. No se modifican la cotización compartida, los proveedores, la confirmación de pago ni la creación de cuentas.
- En el Studio integrado `/studio`, la sección se llama Productos digitales. Los nuevos documentos parten de digital/active/published=true; Publish sigue siendo el que hace pública la versión del documento. Los productos históricos con published=false, sold_out, discontinued o coming_soon no se reactivan.
- Se admite COP, USD o ambas; al menos un precio positivo para vender. Se mantiene la proyección nested/legacy existente. El formulario ofrece solo métodos con precio válido; COP→Bre-B y USD→PayPal. La portada utiliza images[0].
- Los archivos nuevos se guardan en `privateDigitalFiles` con título, descripción, pathname, nombre, tipo y tamaño. La carga desde el navegador es multipart, sin lista cerrada de extensiones/MIME y sin enviar los bytes a una función de Next. Se comprueba la sesión Sanity y el permiso de escritura del borrador product exacto antes de emitir el token limitado a su ruta. No se exige ADMIN de la web.
- Cada descarga pasa por `/api/productos/:id/archivos/:key`: sesión + entitlement PRODUCT vigente/no revocado + archivo del producto. Se transmite como attachment/application-octet-stream, no hay redirect a almacenamiento, no se revela su token y no hay caché compartida. Un navegador que no previsualice un formato puede descargarlo.
- `digitalFiles` queda de solo lectura para conservar accesos históricos. Sus URLs de CDN siguen siendo públicas: proteger la página o el dataset no revoca una URL ya difundida. No se copian, privatizan ni eliminan archivos antiguos en esta entrega; esa decisión queda aparte.

## Configuración imprescindible

Preview, exclusivamente proyecto EYD `81jpalr2` / dataset `preview`:

1. Sanity debe reconocer `https://preview.energiaydivinidad.com` como host de desarrollo con credenciales. Al diagnosticar, el Studio muestra «Connect this studio to your project» y el gestor no tiene sesión. Iniciar sesión con Aleyda o editor equivalente y comprobar edición/publicación sin elevar roles por iniciativa propia. El host git-preview redirige a ese dominio.
2. Conectar un Blob **privado**, exclusivo de Preview, y configurar `PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN` solo en Preview. No usar un store o token Production. `GET /api/studio/product-files` informa de disponibilidad sin secretos. No usar el token genérico `BLOB_READ_WRITE_TOKEN` como fallback.
3. Usar `/studio` integrado en la web del entorno; la carga llama a un endpoint del mismo origen. El Studio externo histórico no dispone de esa API. No modificar ni desplegar el Studio externo de contenidos reales en esta fase.
4. `DIGITAL_PRODUCTS_MAX_FILE_BYTES` opcional, por defecto 2147483648 (2 GiB). Debe ajustarse a la capacidad autorizada y validarse con un vídeo representativo.

Production, **solo después de autorización del SHA y de la configuración concreta**: Blob privado separado + `DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN`, dataset real del mismo proyecto, host del Studio integrado reconocido en Sanity y límite/capacidad adecuados. No copiar el store, secretos ni producto QA de Preview. Si se sigue usando el editor externo histórico, hará falta publicar allí el esquema del mismo commit o utilizar `/studio` integrado; no basta publicar Next para actualizar ese editor externo.

### Límites pendientes para vídeos

El equipo observado está en Hobby y no tiene stores conectados. La documentación vigente de Vercel indica 1 GB/mes de almacenamiento incluido; subida máxima técnica de 5 TB y multipart recomendado a partir de 100 MB. Esto no acredita capacidad disponible de la cuenta para vídeos comerciales. Las descargas privadas pasan por una Function; en Hobby la duración máxima de 300 s incluye enviar el stream. No se garantiza una descarga de varios GB por conexión móvil lenta. Validar tamaño y velocidad real antes de dar soporte comercial por acreditado; cualquier ampliación de plan o servicio requiere decisión del titular. No sustituir por enlaces públicos para evitar el límite.

Fuentes oficiales consultadas 13/11/2026:
- https://www.sanity.io/docs/content-lake/manage-assets
- https://vercel.com/docs/vercel-blob/private-storage
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/functions/limitations

## Diagnóstico de precios del Diccionario

Consulta de solo lectura en dataset Preview: `73bf812e-1a49-41d0-b273-bf462ea6683c`, digital/active/published=true, price=90000, priceUSD=29 y pricing=null. La ficha actual, a 375×667, muestra 29 USD para PayPal y 90.000 COP al seleccionar Bre-B, sin crear pedidos. El antiguo mensaje de precio ausente no se reproduce en esta base. No se atribuye a una causa no demostrada ni se cambian sus precios. Se observó recorte horizontal del formulario y se añadieron min-w-0/break-words en sus controles.

## Validación y relevo

- Base: `5d1b19f67c3abbc136864121aea40525f134bb17`, rama de trabajo `feat/digital-products-studio-20261113`.
- Base Preview revalidada: Vercel Ready `dpl_EWhGTXtMyxBdvfeVBz4tSugYVuuQ`; proyecto/equipo/repositorio/preview/SHA y aliases confirmados en UI y CLI. No confundir el ID de la barra de feedback vercel.live con el despliegue del proyecto.
- `local:check` bloqueado por DATABASE_URL ausente; no se arrancan Next/Studio/Prisma ni se simula un build local con conexiones inventadas. El build del candidato se verificará en Vercel Preview.
- Validación local: 290/290 tests aislados (20 nuevos de productos), TypeScript correcto, ESLint de cambios 0 errores/0 avisos, incluido uploader/schema nuevos comprobados con --no-ignore. Formato correcto en los archivos sujetos a la configuración raíz. Resultados remotos/SHA final en AUTONOMY_STATUS.md.
- QA remota obligatoria pendiente de host Sanity y store: un único producto sintético con audio/vídeo/PDF/ZIP. Publicar con editor, validar primero a 375 px y después escritorio, probar COP/USD/ambas usando la misma ficha, y restaurarla a ambas monedas para compra.
- Compra 1: PayPal sandbox, aprobación personal cuando corresponda, captura verificada y cuatro archivos descargables desde Mis compras. Compra 2: Bre-B **simulado**, declaración/confirmación ADMIN de prueba, cuatro archivos y una entrega por orden. No realizar transferencias reales.
- Acceso negativo: otra cuenta/sin sesión contra endpoint y URL directa del Blob; compra pendiente, acceso revocado/caducado, archivo ajeno. Un 404 de una ruta inexistente en un despliegue viejo no acredita esta prueba.
- Regresión breve: acceso histórico ya comprado y pruebas automatizadas de checkout/cotización/confirmación; si se modifica otro flujo compartido, validar el comportamiento afectado antes de cerrar.
- Producto de prueba y compras nuevas creados durante diagnóstico: 0. No hay migración ni datos de prueba en Production.
