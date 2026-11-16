# Histórico sustituido - no ejecutar

Propuesta anterior de Blob/500 MB, conservada íntegra como referencia. El procedimiento vigente está en activacion-productos-digitales-production.md.

# Activación de productos digitales en Production · propuesta pendiente de aprobación

Fecha: 14/11/2026. Repositorio exclusivo `aleydapaola/energia-y-divinidad`, equipo Vercel `aleyda-paola-vargas-projects`, proyecto `energia-y-divinidad`.

## Estado actualizado después de la autorización exclusiva de Preview

El SHA `cf90c6874b71072241f5695646f1ae39981c7c86` ya está enviado a `origin/preview` y **Ready**: `dpl_C4bV4tbrn5S3nxi3itWxTMqNKjJf`, https://preview.energiaydivinidad.com e inmutable https://energia-y-divinidad-lwdfk44md-aleyda-paola-vargas-projects.vercel.app. Smoke descrito abajo completado primero a 375×667/100% y después en escritorio, sin escribir contenido: readiness true/500 MB; Aleyda/proyecto/dataset preview; vídeo conservado y ficha fuera de venta; catálogo y Mis Compras/pedido completado/enlace Acceder correctos. No nuevas subidas/publicaciones/compras/descargas/envíos. Este resultado sustituye el estado «solo local» de la preparación inicial conservada abajo.

**Production no tiene autorización ni cambios.** Propuesta concreta para aprobación: store Private independiente `eyd-productos-production`, conexión solo Production; `DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN` secreto exclusivo de ese store/ámbito; `DIGITAL_PRODUCTS_MAX_FILE_BYTES=500000000` (500 MB) solo Production, sujeto a necesidades de archivos reales. El archivo probado es de 12 MB; no se ha acreditado una carga/descarga de 500 MB. Cerrar región y capacidad antes de crear/configurar.

Coste reconsultado: [Pro](https://vercel.com/docs/plans/pro-plan) base 20 USD/mes incluye un puesto de despliegue y crédito de uso de 20 USD; consumo adicional/impuestos/puestos extra aparte. [Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing) factura almacenamiento, operaciones y transferencia; la entrega privada añade consumo de Functions. Sin volumen de archivos/descargas no se acredita total mensual. Ninguna contratación realizada.

## Candidato preparado

- Rama local: `feat/digital-products-studio-20261113`.
- SHA: `cf90c6874b71072241f5695646f1ae39981c7c86`.
- Base editorial ya validada: `43a8344d7bb13e4f7d959803a7df7ede67c0bc11`, Preview Ready `dpl_39V79T23VJuNw6FBZNcraQdZATX6`, https://preview.energiaydivinidad.com.
- El nuevo commit está **solo en local**: no se ha hecho push, build ni QA remota de este SHA. La petición actual prepara el candidato y el orden de activación; no ejecuta configuración o despliegue Production.
- Único archivo del commit: `sanity/sanity.config.ts`, 3 líneas añadidas y 2 retiradas. Se conserva el proyecto exacto `81jpalr2` y se admite dataset `preview` o `production` para `auth.loginMethod=token`.
- Esa configuración la importa únicamente `app/studio/[[...tool]]/page.tsx` para el Studio integrado. Sin cambios en `lib/auth.ts`, las rutas de autenticación de compradores, roles, proveedores de acceso, cookies de compradores o configuración del Studio externo `sanity.config.ts`.
- Tipos, ESLint del archivo con `--no-ignore --max-warnings 0`, 20/20 tests aislados de productos y `git diff --check` correctos. No se arrancó Next/Studio/Prisma ni se ejecutaron migraciones/build locales. La nueva condición Production se revisa por código; no se atribuye una prueba real Production a Preview.
- El candidato completo incluye la funcionalidad digital validada en los commits anteriores. Frente al último main consultado `5d1b19f67c3abbc136864121aea40525f134bb17`, son 18 archivos, sin diferencias en `prisma/`. El build existente ejecuta `prisma migrate deploy`: antes de publicar hay que comprobar que no haya migraciones pendientes ajenas; no ejecutar migraciones administrativas locales.

Diff mínimo: `git diff 43a8344d7bb13e4f7d959803a7df7ede67c0bc11 cf90c6874b71072241f5695646f1ae39981c7c86 -- sanity/sanity.config.ts`.

## Comprobación breve prevista en Preview sobre el SHA nuevo

1. Enviar exclusivamente este SHA a Preview y observar Ready; contrastar equipo/proyecto/repo/rama/SHA/alias. No marcar el nuevo SHA probado mientras el alias siga sirviendo 43a8344d.
2. Primero a 375 px: comprobar `/api/studio/product-files` → `ready=true` y límite Preview esperado; abrir Studio con la sesión habitual de Aleyda y confirmar proyecto `81jpalr2`/dataset `preview`.
3. Abrir sin editar la ficha QA editorial existente: vídeo y metadatos conservados, Estado Descatalogado, Publicado activado. Comprobar que sigue fuera del catálogo. Revisión rápida posterior en escritorio.
4. Comprobar que una sesión compradora de prueba ya abierta sigue accediendo a Mis compras, sin cerrar sesión ni repetir compra, pago, descarga o correo. Si ya no hay sesión, dejar constancia; no obtener credenciales nuevas para este smoke.

No repetir carga, publicación ni compra: la rama Preview del condicional conserva exactamente el comportamiento que superó la prueba editorial. El cambio añade únicamente el caso del dataset production.

## Orden exacto de activación Production, solo después de aprobación explícita

1. **Cerrar Preview y aprobación.** Completar el smoke anterior y presentar su resultado. Revalidar el SHA candidato, main remoto y el despliegue Production vigente, dominio/equipo/proyecto/repositorio. Obtener aprobación explícita de Xavier para este SHA, las dos variables, creación/conexión del store y el despliegue. La contratación, si hace falta, requiere también aprobación propia. No aceptar un cambio del candidato sin nueva aprobación.
2. **Decidir capacidad antes de configurar.** Acordar límite por archivo en bytes, región del store y plan/coste autorizado. `500000000` equivale a 500 MB decimales y es solo un ejemplo hasta que Xavier lo apruebe; no trasladar automáticamente el límite de Preview. No hay presupuesto de consumo cerrado sin tamaños y descargas previstos.
3. **Crear el store privado separado.** En Vercel, comprobar equipo `aleyda-paola-vargas-projects` y proyecto `energia-y-divinidad`; entrar en **Storage → Create Storage → Blob → Continue**, seleccionar acceso **Private**, nombre propuesto `eyd-productos-production` y la región aprobada. Confirmar que es privado antes de crearlo. Conectarlo exclusivamente al proyecto EYD y al ámbito **Production**; no seleccionar Preview/Development ni reutilizar `eyd-productos-preview`. No usar el comando de creación con `--yes`, porque puede conectarlo a todos los entornos.
4. **Configurar el token exclusivo.** En **Settings → Environment Variables**, añadir `DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN` como secreto/sensible, exclusivamente **Production**, con el token de lectura/escritura del nuevo store privado. Realizar la entrada por el gestor seguro de Vercel, sin imprimirlo, guardarlo en documentos o `.env`, ni copiarlo al chat. Si la conexión crea automáticamente `BLOB_READ_WRITE_TOKEN`, esa variable genérica por sí sola no sirve para este código en Production. No sustituir ni modificar el token de Preview. La integración puede crear metadatos auxiliares; no ampliar sus ámbitos.
5. **Configurar el límite.** Añadir `DIGITAL_PRODUCTS_MAX_FILE_BYTES`, exclusivamente **Production**, con el entero positivo de bytes aprobado. Guardar ambas variables antes de iniciar el build. No son variables `NEXT_PUBLIC_`. Mantener proyecto Sanity `81jpalr2` y dataset real `production`; verificar también la correspondencia del dominio público. CORS de los dominios raíz/www constaba Allowed el 14/11: revalidarlo; si faltara, cualquier cambio necesita autorización concreta, sin ampliar roles.
6. **Desplegar el commit aprobado.** Revalidar que main siga siendo ancestro del candidato. Publicar por la vía Git habitual/autorizada de EYD con avance rápido de main al SHA exacto; si main ha cambiado o no admite fast-forward, detener esa publicación y preparar la integración para revisión, sin force-push ni merge de otro SHA por iniciativa propia. Esperar build Production Ready y verificar SHA/dominio. Se necesita un build con entorno Production y las variables recién guardadas: no promocionar los artefactos compilados de Preview, que contienen su dataset/configuración. No hace falta desplegar el Studio externo mediante `sanity deploy`: el `/studio` integrado se entrega con Next.
7. **Verificar antes de declarar operativo.** Ejecutar las comprobaciones inferiores. No realizar una compra ni crear datos QA en producción. Una carga real requiere autorización para ese archivo/ficha; puede ser realizada por Aleyda. No marcar PASS editorial de producción si únicamente se comprobó disponibilidad de configuración.

Los nombres de navegación de creación del store proceden de la documentación oficial; deben contrastarse con el diálogo vigente antes de guardar. Las variables nuevas solo se aplican a despliegues nuevos, no al despliegue anterior.

## Qué verificar en Production

- Despliegue **Ready**, SHA exacto autorizado, target Production y dominio público EYD. `/api/studio/product-files` devuelve `ready=true` y el límite elegido, sin exponer secretos. Esa respuesta comprueba presencia/formato, no validez del token ni conexión real al store.
- `https://energiaydivinidad.com/studio`: identidad de Aleyda, proyecto `81jpalr2`, dataset `production`, rótulo CONTENIDO REAL y origen correcto reconocido. Renovar solo sesión Sanity Studio para obtener token con su proveedor habitual y mismos permisos. Intervención personal para contraseña/CAPTCHA. El login de compradores se comprueba aparte, con una sesión autorizada existente y sin generar pedidos.
- Bajo autorización editorial concreta, comprobar una carga de un archivo real elegido por Aleyda en su ficha autorizada, inicialmente borrador: progreso completado, nombre/tamaño conservados al recargar y objeto en el nuevo store privado/ruta de production. No subir fixtures QA a datos reales ni publicar la ficha por iniciativa del agente. Comprobar que una petición anónima a ese objeto privado no entrega el archivo, sin usar ni revelar credenciales en la petición.
- Si Aleyda publica el producto real autorizado, comprobar catálogo/ficha primero a 375 px y después en escritorio: portada/descripción, precio y método correctos (COP/Bre-B; USD/PayPal). No repetir ni efectuar un pago real. La entrega compradora y retirada persistente ya están validadas en Preview; una prueba positiva completa de entrega en Production necesitaría una compra/permiso real autorizado y queda fuera de este smoke.
- Si no se autoriza todavía la carga real, el cierre será **despliegue y configuración verificados; primera carga editorial Production pendiente**, sin declarar la función operativa de extremo a extremo.

## Recuperación

Registrar el despliegue Production anterior antes de publicar. Si falla el candidato, detener activación y, con autorización de Xavier, restaurar ese despliegue. Conservar el store privado y los archivos ya subidos; no borrar datos, sobrescribir secretos o retirar compras para resolver un fallo. Registrar si el candidato llegó a publicar o cargar contenido real antes de cualquier reversión.

## Fuentes y guía editorial

- [Crear un Blob privado](https://vercel.com/docs/vercel-blob/private-storage#creating-a-private-blob-store).
- [Variables de entorno y despliegues nuevos](https://vercel.com/docs/environment-variables).
- [Guía de Aleyda](guia-aleyda-productos-digitales.md).
