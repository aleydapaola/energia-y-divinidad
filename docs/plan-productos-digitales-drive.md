# Plan de productos digitales con Google Drive

## Cierre ampliado para revisión · 16/11/2026

**Estado vigente que sustituye las cabeceras históricas siguientes.** Código funcional verificado: `3eecca84b55d2295a104e185732432b1f9fa0d41`, Ready `dpl_G9HxbjVmg6WBQst3U2MEYmQEjciD`, https://energia-y-divinidad-1889g1c5u-aleyda-paola-vargas-projects.vercel.app y alias https://preview.energiaydivinidad.com contrastados. El candidato final añade documentación a este código; comprobar su SHA exacto en Git/metadata Ready y en el informe final de aprobación. Rama `feat/digital-products-drive-preview-20261115`, mismo worktree; main/Production y servicios reales intactos.

Se reutiliza íntegra la matriz acreditada inferior: publicación Sanity, catálogo/fichas, Bre-B QA-DRIVE-001, único PayPal Sandbox de 20 USD, grant automático de reader a correo verificado/solo carpeta comprada/Restringido, Mis compras y descargas PDF/WAV con hashes, negativa Google ajeno tras entrega, privacidad UI entre lectores, fallo/reintento idempotente, descatalogación, reembolsos, reanudación sin duplicados y máximo 50 MB, menú y portada con dos/cuatro destacados. El flujo de concesión automática de siete pasos sigue vigente. No se han repetido pagos, confirmaciones, descargas compradas ni cambios de permisos de esos casos.

| Comprobación nueva | Estado | Evidencia y alcance |
| --- | --- | --- |
| Portada con cero destacados | verificado en Preview | `1c34b30b`, Ready `dpl_6e1fyLu3ohWkwazJM2dX2sBfphNX`: a 375×667 primero y 1280×667 después, fixture por visita ADMIN `/?qa=home-featured-empty`, banner de cero, sin título/tarjetas/CTA ni hueco reservado. Sesiones/membresía → Sobre mí → Academia. Mismo HomeProducts real; no se cambian Sanity ni los cuatro destacados. Guardas de rol/entorno/proyecto/dataset probadas. `3eecca84` solo añade MIME M4A y conserva este resultado. |
| PDF gratuito de tres páginas | verificado en Preview | Ficha QA gratuita existente `af2dfedc-152f-417d-9dc6-7dd658ba0d7b`, sin pedidos, featured=false; nuevo PDF3969 B, key `3e97cc068e7a`. Móvil375: 1→2→3→2, marcadores QA-01/02/03 correctos, límites de botones/recuento. Escritorio1280: presentación legible y 1→2/QA-02. Sin descarga en visor; `?download=1` → HTTP403 observado en Network. |
| JPG y PNG gratuitos | verificado en Preview | Dos imágenes QA600×400 (19366/14203 B), propias y verificadas desde Studio; publicadas junto con PDF y audio. Ambas visibles completas a375px y revisión de presentación a1280px. Sin botones de descarga; mismo guard genérico ya acreditado. |
| MP3 y M4A/AAC gratuitos | verificado en Preview | Dos audios QA de2s (33480/17741 B). MP3 reprodujo 0:02/0:02 a375px; M4A también tras añadir MIME `audio/x-m4a` reportado por Chrome/macOS. Menú solo velocidad, sin Descargar; controles revisados a1280px. M4A key `26a62d258bb4`, petición explícita de descarga HTTP403 real. Prueba aislada de publicación/stream inline/403 1/1PASS. |
| WAV, MP4/H.264+AAC y regalo newsletter | verificado en Preview | Reutilizados del cierre884aa0a3/73803811: audio/vídeo completos a375px, sin descarga habilitada, escritorio y403; no hay cambios en esos reproductores o rutas. No se repiten por el nuevo alias M4A. |

**Regresión local complementaria:** el test pendiente PayPal/Drive quedó revisado e incorporado en `1c34b30b`; 1/1 PASS aislado (captura confirmada → fallo Drive conserva pago, callback repetido sin recaptura/duplicados, reintento GRANTED). No llama a servicios ni constituye una nueva compra remota; complementa la evidencia Sandbox/QA de la matriz.

**Datos preservados:** la ficha gratuita mantiene PDF/WAV/MP4 originales y añade cinco archivos QA (ocho entradas publicadas); carpeta privada propia `17BEiTqSO_CJ9SiSmke2gAxgrZyZuM7rn`. No se convierte un producto vendido ni se comparten carpetas a mano. La conexión y almacenamiento son los mismos Drive privados. La lectura online usa respuesta inline/rangos; los visitantes no reciben permisos Drive. Deshabilitar descarga no es DRM y no impide captura/grabación técnica. No se acredita compatibilidad universal fuera de Chrome for Testing probado.

**Perfil de lanzamiento decidido por delegación de Xavier:** PDF multipágina, JPG/JPEG y PNG, MP3, M4A/AAC y MP4/H.264+AAC; WAV adicional ya acreditado. EPUB/ZIP quedan fuera de consulta gratuita online. El máximo de carga Drive es **50.000.000 bytes por archivo**; no500MB. No se ha cambiado servicio ni contratado almacenamiento.

**Preparación Production:** [procedimiento vigente](activacion-productos-digitales-production.md), [guía Aleyda](guia-aleyda-productos-digitales.md). OAuth propio estable/consentimiento/propietaria/raíz nueva, Neon/Sanityproduction independientes, migración aditiva, alojamiento comercial/capacidad/cuotas y presupuesto siguen pendientes de validar y aprobar. Retirada tras reembolso **manual** en la subcarpeta y verificada por la aplicación; conservar el reader si otra compra válida lo mantiene. Concesión tras pago sí automática. No se devuelve dinero desde ese registro administrativo.

**Punto de parada:** QA del perfil acordado cerrada en Preview; solicitar aprobación del SHA candidato final exacto. No publicar en Production ni tocar main/configuración/datos reales/gastos. Próxima acción independiente segura: revisión de esta evidencia por Xavier; ningún pago ni prueba cerrada debe repetirse para recuperar contexto.

---

## Cierre anterior de Preview (histórico) · 16/11/2026

**CIERRE DEL PASE AUTORIZADO:** SHA final **`884aa0a31476d8c111270994682d39044caaf280`**, HEAD/originpreview, **Ready `dpl_HXt5kr9oiPEMgWJuxecD6bHMJiYG`**, inmutable https://energia-y-divinidad-7di0yxftn-aleyda-paola-vargas-projects.vercel.app y https://preview.energiaydivinidad.com coinciden en inspect. Este cierre sustituye los estados intermedios de candidato/QA en curso inferiores. `a6cb60ec` corrige etiquetaGratis enStudio (observada) y `884aa0a3` corrige texto/CTAcatálogo, comprobados375primero y1440después. PDF/audio/vídeo online y403 de73803811 se reutilizan porque esos ajustes solo cambian textos. Regalo compartido: nueva reproducción375px0:19/pausa y6/6 testsPASS, anteriores endpoint403/escritorio conservados.

Pendientes solicitados de negativa/privacidad UI, fallo/reintento, descatalogación, reembolsos, reanudación50MB y publicación gratuita PDF/WAV/MP4 quedan verificados según matriz. No bloqueo de login. La limitación del audio NATIVO Drive no impide ya el audio WEB probado sobre mismo almacenamiento privado. No atribuir pruebas remotas de imágenes/otros códecs/PDF multipágina ni invisibilidad universal de metadatos; no se pidió cambiar el servicio y no se cambió. Production/configuración real/main/gastos siguen sin aprobación; condiciones de OAuth/aislamiento/alojamiento del plan requieren revisión específica antes de publicar comercialmente.

**Uso editorial nuevo:** Sanity→Productos digitales→ficha NUEVA→Acceso gratuito→Gratuito · solo en línea; subir sus propios archivos (no referencias/carpetas vendidas), verificar y publicar. La ficha apareceGratis y sin checkout; sus visitantes leen/ven/oyen en la web, sin botones de descarga. No compartir manualmente la carpeta ni hacerla pública. Los archivos siguen restringidos/owneronly. La ruta rechaza cualquier producto asociado a pedidos, aunque el editor lo marquegratis. Deshabilitar controles de descarga no constituye DRM. FichaQA de revisión: https://preview.energiaydivinidad.com/productos/qa-gratuitos-online-20261116, idaf2dfedc-152f-417d-9dc6-7dd658ba0d7b, carpeta17BEiTqSO_CJ9SiSmke2gAxgrZyZuM7rn.

**Siguiente paso exacto:** revisión personal de Xavier de884aa0a3 y esta evidencia; conservar casos originales yQA. No repetir compras/capturas/descargas cerradas. Solo después de aprobación específica preparar cualquier paso aProduction, con entorno y servicios independientes. Detalle de pedidos/auditoría/limitaciones en la cabecera deAUTONOMY_STATUS.md. Documentación local previa conservada fuera de commits de aplicación.

**Registro intermedio superado — primer candidato gratuito Ready:** `738038112831c3aee5a953ff9edbb9490a465a50`, **dpl_BrA8vQwurfTwxb69LJdpYQDwG1gu**, https://energia-y-divinidad-jznkkvrk4-aleyda-paola-vargas-projects.vercel.app, aliasPreview contrastado tras build. Base auditadaf88c81dd se conserva abajo como referencia; negativos/privacidad/fallo/reintento/descatalogación/reembolsos/subidas nuevos acreditados en esa base siguen aplicables: el nuevo commit solo agrega gratuitos aislados y reutilización de reproductor. En ese registro intermedio el QA estaba en curso; el cierre superior y la matriz incorporan los PASS posteriores.

Esta sección y la cabecera de AUTONOMY_STATUS.md sustituyen las instrucciones de concesión manual, cambio de correo de entrega y estados de implementación históricos inferiores. La implementación vigente entrega automáticamente solo al titular web con correo verificado; no acepta destinatario/carpeta arbitrarios. Se conservan las notas inferiores como historial, no como pasos a ejecutar de nuevo.

Worktree `/private/tmp/eyd-drive-preview-20261115`, rama `feat/digital-products-drive-preview-20261115`. Base de la auditoría anterior: **`f88c81dda34b542893b290e5f338da74dc7ffd61`**, Ready **`dpl_BnULQwuiiwrzAhmmXmYFU8h9FRYT`**, https://preview.energiaydivinidad.com (inmutable https://energia-y-divinidad-aazwbt0wq-aleyda-paola-vargas-projects.vercel.app). Revalidado al retomar. Cambios locales conservados. Desde0d26360d se añadieron regalo online, log de recuperación y presentación compartida de catálogo/portada; las compras y entrega Drive no cambiaron. Las pruebas de presentación afectadas se repitieron y cerraron en f88c81dd. No repetir compras, subidas ni descargas acreditadas por rutina.

### Flujo vigente de pago y concesión automática

1. Sanity publica la ficha con archivos privados verificados; Neon conserva carpeta, manifest y referencias privadas del producto/entorno. El pedido fija esa carpeta en servidor.
2. Mientras no haya pago confirmado y entrega GRANTED, Mis compras no muestra el enlace privado.
3. Confirmación Bre-B simulada o captura PayPal Sandbox → pedido COMPLETED y entitlement. El fallo de Drive no revierte ese pago.
4. La aplicación relee titular y correo verificado, comprueba carpeta/archivos/ACL y concede **reader** a ese correo únicamente en la subcarpeta comprada. No destinatario arbitrario, concesión manual ni raíz compartida; acceso general sigue Restringido.
5. Tras verificar el permiso, registra GRANTED y drive_auto_grant; Mis compras enlaza mediante ruta autenticada que revalida titular/pago/entitlement.
6. Si Drive falla, entrega pendiente y reintento de entrega sin nueva confirmación, compra ni captura. Caso remoto QA-RECOVERY-001 comprobado y recuperado, sin segundo cobro.
7. Descatalogar conserva compras anteriores. Reembolso QA registra un reembolso ficticio ya verificado y retira únicamente el entitlement correspondiente; la retirada en Drive es manual y la verifica el servidor, conservando un permiso mantenido por otra compra válida. Ambos casos remotos comprobados en pedidosQA aislados7137…/af0f….

### Continuación autorizada el16/11

**Decisión de implementación de gratuitos, ya comprobada en Preview:** conservar el mismo Drive privado y alcance drive.file. Se reutiliza el reproductor del regalo y su patrón de respuesta inline/rangos, con una ruta específica que solo resuelve archivos verificados de una ficha Sanity activa/publicada/isFree. El servidor lee esos bytes como propietaria; Drive queda Restringido/solo propietaria, sin compartir públicamente ni conceder permisos a visitantes. PDF usa PDF.js6.5.438 con worker servido por la web y controles de páginas propios; audio/vídeo usan controles online sin descargar. No se añade otro servicio, almacenamiento ni variable. Cualquier pedido asociado al producto, incluso pendiente/reembolsado, impide publicar sus bytes por la ruta gratuita: usar ficha/carpeta nuevas. Restricción de copia/descarga se aplica solo a esos archivos gratuitos aislados. La consulta online entrega bytes al navegador, igual que el regalo; deshabilitar botones y descarga explícita no constituye DRM ni impide capturas/recuperación técnica. La limitación del reproductor nativo de Drive para audio permanece: esta alternativa quedó comprobada en la web, sin habilitar descarga ni alterar audios comprados. Subidas siguen directas/reanudables, sin proxy ni tokens Google en navegador.

Orden autorizado: negativa de una cuenta Google ajena tras entrega; privacidad entre dos lectores; fallo/reintento aislado; descatalogación y reembolso respetando otras compras. Después: reanudación y límite50MB; gratuitos desde Sanity, PDF/vídeo/audio online sin descarga habilitada, reutilizando reproductor newsletter. Casos remotos ya comprobados según matriz. Cuenta adicional xaviermonfortfaure@gmail.com: inicio personal completado y negativa posterior a entrega observada. No Production/main/cobros reales/gastos.

| Requisito | Estado | Evidencia válida y siguiente paso |
| --- | --- | --- |
| Sanity → carpeta privada Drive, PDF/WAV persistentes | verificado en Preview | Hitos8–10: uploader real, verificación y persistencia; raíz exclusiva y carpeta Restringida. Reutilizado. |
| Publicación en catálogo y precios | verificado en Preview | Ficha QA publicada, COP80000/USD20, móvil375/escritorio. Hitos8–9 reutilizados. |
| Bre-B simulado QA-DRIVE-001 | verificado en Preview | BREB-56ad0181-4e30-4d24-b7d7-6438536a1239 completado y grant automático auditado; no confirmar otra vez. |
| Entrega automática Bre-B | verificado en Preview | Reader xmonfau, solo subcarpeta comprada, Restringido. Evidencia anterior reutilizada. |
| Mis compras → PDF/audio | verificado en Preview | Nuevo tramo de esta revisión: login web xmonfau y clic a carpeta correcta con Google xmonfau a375px. Descargas/hash de esos mismos archivos se reutilizan de la sesión anterior, sin repetirlas. |
| PayPal Sandbox → permiso nuevo → Mis compras | verificado en Preview | PP-1b1cc9ee-81a8-4dc3-9e6c-4508391f616a: un pago20USD, COMPLETED, drive_auto_grant y reader NUEVO sobre1plp5…; antes Necesitas acceso, después lector/Restringido. Mis compras abre nueva carpeta; PDF/WAV nuevos descargados y hashes correctos. PP-136c19cf… antiguo sigue sin pagar. |
| Rechazo sin sesión web/Google | verificado en Preview | Endpoint401 sin enlace y carpeta Drive exige login. Evidencias reales anteriores reutilizadas. |
| Otra cuenta Google autenticada sin permiso tras entrega | verificado en Preview |16/11: xaviermonfortfaure@gmail.com autenticado en Guest abre carpeta PayPal1plp5… y ve Necesitas acceso después de entrega. Sin permiso ni solicitud en esa carpeta. |
| Privacidad entre dos lectores | verificado en Preview |16/11, carpeta QA aislada1Jt… compartida solo owner+2readers xmonfau/xaviermonfortfaure, sin notificar. Ambos Google autenticados acceden; Compartir muestra «Como eres lector…» sin lista; Detalles/Quién tiene acceso dice «No tienes permiso para ver la información…». Segundo lector ve email de propietaria/fecha; Actividad solo propietaria y Tú Lector, sin otro comprador. PDFQA también comprobado para ambos. Resultado limitado a superficies UI observadas, no garantía universal de API/servicio. |
| Fallo Drive conserva pago y reintento idempotente | verificado en Preview |16/11, caso aislado QA-RECOVERY-001 / BREB-7137b5ca…: carpeta nueva temporalmente fuera de parent esperado, confirmación simulada única deja Completado/Acceso pendiente; restaurar raíz y un Reintentar entrega deja Acceso concedido y drive_auto_grant, misma compra y única MANUAL_PAYMENT_CONFIRMATION. Originales conservados. |
| Reembolso conserva otra compra válida | verificado en Preview | QA aislado7137… reembolsado y Acceso retirado/drive_refund+drive_revoke; af0f8c86… sigue Completado, enlace en Mis compras y abre carpeta con PDF/WAV como Googlexmonfau. Propietaria confirma owner+reader/Restringido. Sin devolución real ni cambio en compras cerradas. |
| Reembolso final retira acceso aplicable | verificado en Preview | Segundo QA af0f… REFUNDED; servidor rechaza verificar mientras reader sigue. Quitar únicamente readerxmonfau en carpetaQA1DX…→Guardar→Acceso cambiado; posterior verificación deja REVOKED/drive_revoke. Retirada manual verificada, no revocación automática; no toca permisos comprados de otras carpetas. |
| Descatalogar conserva acceso comprado | verificado en Preview | ProductoQA a748… Descatalogado y Published; af0f8c86… mantiene enlace desde Mis compras y carpeta accesible para xmonfau con ambos archivos. |
| Reanudación sin duplicados y máximo50MB | verificado en Preview |16/11, tercer elemento de borradorQA aislado:50.000.001B rechazado;50.000.000B acepta, interrumpido a8% con Offline, red restaurada y mismo archivo/elemento termina verificado. Drive contiene UNA copia47.7MiB y dos archivos sintéticos anteriores, sin archivo excedido. Red normal restablecida. |
| Regalo newsletter online sin descarga habilitada | verificado en Preview |26512c4a: móvil375/escritorio1280, reproducción/avance y menú sin descarga; download=1 devuelve403. Sin diff en2a956edf; reutilizado. |
| PDF/vídeo gratuitos en Drive sin descarga | verificado en Preview | Copias QA separadas con lector: PDF visible, vídeo2/2seg, sin Descargar y restricciones de propietario. No equivale a ficha gratuita en catálogo. |
| Publicación gratuita desde Sanity y consulta online | verificado en Preview |73803811, QA af2dfedc… publicada con pricing.isFreetrue, carpeta/3archivos nuevos17BE… owneronly/Restringido.375px primero: PDF.js página1de1 legible, WAV+MP4 reproducen0:02/0:02, menús solo velocidad; descarga explícita403 real. Escritorio1440CSS: página/controles/media legibles y cargados, sin solapamientos observados. Catálogo muestraGratis y clic móvil abre ficha sin checkout. Etiquetas editoriales/catálogo corregidas y comprobadas en el Ready final884aa0a3, móvil375 antes de escritorio1440. |
| Audio gratuito desde Drive privado sin descarga habilitada | verificado en Preview | Se conserva bloqueo del reproductor NATIVO de Drive; alternativa web usa mismo almacenamiento/drive.file, lectura serverowner + respuesta inline/rangos y reproductor del regalo. AudioQA privado se escucha completo a375px, sinDescargar; endpointdownload1→403. Sin nuevo servicio, almacenamiento ni permisos públicos; no afecta audio comprado. |
| Menú Productos y cuatro destacados de portada | verificado en Preview | f88c81dd: menú de8enlaces, Productos→/productos; hasta4 featured ordenados en Sanity, casos2y4 reales. Después de Cómo quieres comenzar y antes de Sobre mí/Academia.375px1columna,1280px2×2, cuatro fichas y CTAcatálogo. Captura móvil completa conservada. |

Preparación nueva autorizada para PayPal: duplicado QA `3cbdb502-bf22-41b8-ae77-e8604f05df9d`, título `PRUEBA — PayPal Drive nuevo — NO REAL — 20261115`, slug `qa-paypal-drive-nuevo-20261115`. Se retiraron solo de la copia las referencias privadas heredadas, sin tocar documento/archivos originales. PDF/WAV nuevos verificados y ficha publicada en Sanity Preview. Carpeta nueva `1plp5imXlPo255tk4NW3-xlTzEGOMsxWI`: propietaria únicamente/Restringido y xmonfau con Necesitas acceso ANTES del pago; después de aprobación personal y captura20USD, ADMIN muestra completado/drive_auto_grant, Drive muestra propietaria+xmonfauLector/Restringido. No permiso manual. Mis compras375px abre nueva carpeta con Google xmonfau; PDF609B y WAV88244B descargados, hashes iguales a originales. Recursos nuevos preparados para demostrar grant fresco, conservando compra y carpeta Bre-B. Referencia pagada PP-1b1cc9ee-81a8-4dc3-9e6c-4508391f616a; interno cmwiedsrc0002jw083a4obhlw. No repetir captura/pago/descargas. Detalle en AUTONOMY_STATUS.md.

Interrupción/reanudación50MB, descatalogación/reembolsos y privacidad de lectores quedan acreditados con casosQA nuevos según matriz. La regresión remota de reservas mencionada en el plan histórico no se ha ejecutado en esta continuación: reservas no cambia y se conservan sus pruebas previas aplicables; no atribuir nuevas reservas reales. Production/main, configuración de servicios de Production, dinero real y gastos permanecen fuera de autorización.

---

Plan inicial: 14/11/2026. Actualizado 15/11/2026 tras aprobación de Xavier del plan ampliado. **Implementación y pruebas gratuitas autorizadas exclusivamente en Preview; trabajo parcial sin commit.** Estado real, bloqueos y punto seguro en AUTONOMY_STATUS.md del worktree `/private/tmp/eyd-drive-preview-20261115`. Ninguna autorización para Production, main, datos reales ni gastos. Sustituye la propuesta Supabase para archivos nuevos; no autoriza migrar alojamiento ni recursos existentes.

## Base y alcance

- HEAD y rama actuales: `cf90c6874b71072241f5695646f1ae39981c7c86`, `feat/digital-products-studio-20261113`. Sin commits posteriores. Hay documentación local pendiente que se conserva.
- Preview reconsultado: https://preview.energiaydivinidad.com → `dpl_C4bV4tbrn5S3nxi3itWxTMqNKjJf`, Ready, proyecto `energia-y-divinidad`, equipo `aleyda-paola-vargas-projects`. La correspondencia con el SHA completo consta en el cierre del despliegue anterior; el inspect de esta revisión confirma mismo despliegue y alias.
- Una sola web, Sanity editorial, Neon para pedidos/permisos y Drive solo para nuevos archivos. Sin cambios de políticas comerciales, pasarelas, cuotas, dominio, main ni Production.
- Mantener PayPal y Bre-B actuales, sus monedas admitidas y confirmaciones. **Tras validar en Preview ambos pagos y entrega privada**, añadir Productos a menú escritorio/móvil y catálogo desde portada; ambos cambios en el mismo lanzamiento. Solo pagos a plazos quedan fuera de alcance. Preservar archivos Blob/Sanity existentes y acceso de compradores previos; no copiar, borrar ni migrar automáticamente.

## Código reutilizable y cambios mínimos

| Pieza actual | Uso propuesto |
| --- | --- |
| `sanity/components/PrivateProductFileInput.tsx` | Conservar el editor, selección de archivo y progreso; añadir transporte Drive para productos nuevos. No cambiar el login de compradores. |
| `app/api/studio/product-files/route.ts` | Reutilizar comprobación de identidad Sanity y capacidad de editar el borrador. Añadir inicio, consulta y finalización de subida vinculados a editor/producto/dataset. |
| `lib/checkout/one-time-checkout.ts` y rutas actuales de PayPal/Bre-B | Conservar cotización, creación de pedido y captura/confirmación; guardar referencia interna del proveedor/carpeta del producto al crear el pedido. |
| `app/api/admin/orders/[id]/confirm-payment/route.ts` | Conservar confirmación Bre-B, comprobación del ingreso, referencia única, bloqueo e idempotencia. Cambiar solo el texto y estado de entrega de PRODUCT Drive. |
| `lib/payment-processor.ts` | Mantener procesador común de PayPal y Bre-B y creación de entitlement. Preparar entrega pendiente de forma idempotente; ninguna llamada a Drive para conceder permisos durante el cobro. |
| `app/mi-cuenta/compras/page.tsx` | Conservar consulta por usuario de sesión. Para Drive, mostrar título enlazado solo al cumplir pago y entrega; en otro caso «Acceso pendiente». |
| `app/mi-cuenta/productos/[id]/page.tsx` y `app/api/productos/[id]/archivos/[key]/route.ts` | Mantener entrega Blob anterior; impedir que una entrada alternativa al nuevo producto Drive eluda la comprobación de entrega por pedido. |
| `prisma/schema.prisma` y AuditLog | Añadir almacenamiento/subidas y entrega digital auditada. No reutilizar `PerkAllocation.deliveredAt`: corresponde a eventos. |

`lib/order-access.ts` admite también una cookie firmada para consultar pedidos de checkout. El enlace de Drive desde Mis compras exigirá **sesión autenticada + order.userId coincidente**; esa cookie sola no concederá acceso a la entrega.

## 1. Puerta de viabilidad antes de completar la implementación

La API documenta subida reanudable: inicio autenticado en servidor, URI de sesión, PUT del navegador y recuperación mediante estado/offset. La URI dura aproximadamente una semana; se tratará como una capacidad secreta, sin logs ni caché. El navegador no recibirá access token, refresh token, client secret ni clave de cifrado de Google.

Primera prueba tras autorizar ejecución, exclusivamente con cuenta/carpeta de pruebas:

1. Autorizar a la propietaria y crear una raíz privada de Preview mediante la aplicación.
2. Iniciar sesión reanudable en servidor y transferir desde el navegador de Preview. Comprobar CORS, preflight, subida fragmentada y lectura/consulta del offset. Si `Range` no se expone al navegador, consultar estado desde el servidor sin transportar los bytes del archivo.
3. Interrumpir y reanudar la subida; comprobar archivo final y ausencia de duplicados. Dejar que el navegador establezca Content-Length, que JavaScript no puede fijar manualmente.
4. Comprobar con `drive.file` que se pueden leer los permisos de los elementos creados por la aplicación, incluidos permisos añadidos manualmente por la propietaria.

**Bloqueo si falla:** no comprometer la solución directa ni sustituirla silenciosamente por un proxy de archivos o tokens OAuth en el navegador. Registrar respuesta/fase y presentar alternativa antes de ampliar alcance.

Fuentes: [subidas reanudables](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [alcances de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## 2. Autorización de Google y presupuesto

- Proyecto Google Cloud exclusivo de Energía y Divinidad, cliente OAuth de aplicación web separado del inicio de sesión de compradores y de la cuenta de servicio de Calendar. Aislar clientes/conexiones de Preview y Production. No ampliar alcances ni reutilizar secretos de Calendar.
- Habilitar solo Drive API cuando se autorice ejecución; comprobar antes facturación y cuotas del proyecto. No asociar tarjeta, cuenta de facturación, prueba de pago, ampliación de cuota ni Google One/Workspace. Si Google exige facturación para continuar, detener esta opción.
- Solicitar `https://www.googleapis.com/auth/drive.file` y autorización offline. La app creará sus propias carpetas y archivos; no pedir acceso general a todo Drive. Identificar de forma verificable la cuenta propietaria autorizada y limitar la conexión a ella.
- Cliente/secretos solo en servidor. Refresh token cifrado con clave separada solo servidor; callback protegido por estado de un solo uso, expiración, sesión administradora e identidad propietaria esperada. No guardar tokens en Sanity ni en las cuentas OAuth de compradores.
- Aleyda deberá abrir el enlace de conexión que se prepare en administración de Preview, seleccionar su cuenta propietaria, completar su inicio de sesión/2FA y aceptar el permiso solicitado. No debe compartir contraseña ni copiar tokens al chat. Si el consentimiento o un administrador de Workspace bloquean la operación, registrar intervención exacta, sin eludirla.
- En OAuth External/Testing, el refresh token con Drive caduca a los siete días. Es aceptable para QA con reconexión explícita; antes de Production hay que resolver el estado de publicación/verificación y la reconexión por revocación. Publicar la app OAuth de producción requiere aprobación, igual que su configuración de Production.
- Consultar cuota de almacenamiento disponible de la cuenta, no inferirla del límite gratuito general de 15 GB compartidos con Gmail/Fotos. Registrar bytes de cada producto y margen antes de subir. Propuesta inicial: máximo **50.000.000 bytes por archivo**, configurable y probado antes de afirmarlo como validado; conservar límites/comportamiento de Blob anterior.
- Google declara uso estándar de Drive API sin coste adicional, pero anuncia cargos por exceso de solicitudes más adelante en 2026. Verificar términos y cuotas vigentes de la cuenta al ejecutar, mantener proyecto de pruebas sin facturación y aplicar límites de solicitudes/reintentos. Si el proyecto ya permite cargos o no puede quedar aislado sin facturación, detener configuración hasta decisión del propietario. No se promete gratuidad ilimitada.
- El equipo Vercel figura Hobby/no Pro en la última consulta autenticada de esta sesión. Drive no resuelve el alojamiento comercial: las condiciones de Hobby son para uso personal/no comercial. No declarar posible un lanzamiento comercial de cuota cero sobre este alojamiento sin resolverlo. La alternativa Netlify anterior no se ha validado ni implementado y no se migra como parte de este plan.

Fuentes: [OAuth servidor](https://developers.google.com/identity/protocols/oauth2/web-server), [caducidad de tokens](https://developers.google.com/identity/protocols/oauth2), [cuotas/precio API](https://developers.google.com/workspace/drive/api/guides/limits), [almacenamiento Google](https://support.google.com/drive/answer/6374270), [condiciones Vercel](https://vercel.com/legal/terms).

## 3. Carpetas, privacidad y subida sin duplicados

- Raíz My Drive de Preview exclusiva de pruebas y, en otra fase autorizada, raíz Production independiente. Solo propietaria en la raíz; no usar carpeta pública, raíz compartida con clientes ni unidad compartida que exija otro plan.
- Una carpeta estable por producto, con todos sus PDF/audios. No compartir la raíz. Comprobar permisos heredados y directos: inicialmente solo propietaria; después lectores registrados para ese producto. Rechazar acceso `anyone`, dominio, grupo o permisos inesperados. Los archivos hijos deben pertenecer a la carpeta correcta y heredar solo su acceso; no tener permisos directos adicionales inesperados.
- Mantener referencias Drive **en Neon**, no en documentos publicados de Sanity. El dataset es público y `PRODUCTS_QUERY` devuelve documentos completos; un campo oculto no protege información. Sanity guardará solo proveedor, identificador interno opaco y metadatos editoriales no sensibles. La interfaz autenticada obtendrá estado/manifest desde servidor.
- Modelo aditivo: conexión propietaria cifrada; carpeta y manifest privado por producto/entorno; intentos de subida; entrega por pedido. Persistencia privada en servidor; cada cliente autenticado recibe solo los datos necesarios para su función. La URI de subida se entrega únicamente al editor autorizado para ese intento. La entrega guarda una referencia estable de carpeta para evitar redirigir compras previas al editar otro producto.
- Inicializar upload con clave idempotente y file ID reservado; vincular producto, editor, tamaño y huella. Reintentar sobre el mismo intento/ID y consultar si ya terminó antes de crear nada. Serializar creación de carpeta para evitar duplicados. Tras caducidad, comprobar existencia antes de abrir nueva sesión para ese ID.
- Verificar en servidor que el archivo final existe, no está en papelera, tiene propietario/parent esperados, tamaño y checksum correctos. Solo entonces marcar manifest como verificado y guardar referencia editorial en Sanity. Si falla el guardado editorial, el reintento enlaza el archivo ya verificado, sin subir copia.
- No habilitar venta de una ficha Drive sin carpeta/archivos verificados. No sustituir referencias de productos con compradores de Blob; proveedor anterior sigue atendido. No borrar carpetas ni archivos comprados al descatalogar.

Fuentes: [permisos y herencia](https://developers.google.com/workspace/drive/api/guides/manage-sharing), [IDs reservados](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds).

## 4. Pago confirmado y entrega separada

| Pago del pedido | Entrega Drive | Mis compras |
| --- | --- | --- |
| Pendiente | Pendiente | Estado y acciones de pago actuales; «Acceso pendiente», sin URL Drive. |
| COMPLETED | PENDING_ACCESS | Pago confirmado; «Acceso pendiente», sin URL Drive. |
| COMPLETED | GRANTED | Nombre del producto como enlace a su carpeta privada. |
| Reembolsado/cancelado, permiso revocado o pedido de otro usuario | Cualquiera | Sin enlace autorizado por la aplicación. |

- Bre-B: Aleyda verifica el ingreso y usa confirmación actual una sola vez. PayPal: captura/webhook actuales verifican pago. Ambos terminan en el procesador común y dejan entrega pendiente, conservando entitlement y auditoría.
- No mezclar fallos de Drive con la confirmación de cobro. Reintentar entrega nunca llama a confirmar pago ni crea nueva compra/captura. Repetir callbacks mantiene una sola entrega y un solo entitlement.
- Administración mostrará pedido, pago, **correo de la cuenta de Google para el acceso**, carpeta y estado de entrega. Nuevas etiquetas propuestas, todavía no implementadas ni verificadas en UI: «Cuenta de Google para el acceso», «Abrir carpeta» y «Marcar acceso concedido».
- Por defecto el correo de acceso será el de compra. El comprador autenticado podrá indicar otra cuenta Google para su propio pedido pendiente; no necesita ser Gmail. Guardar auditoría, comunicar a Aleyda el destinatario vigente y mostrarlo al comprador para que abra Drive con esa cuenta.
- Si cambia tras conceder acceso: volver a entrega pendiente, requerir revisión de Aleyda y retirada manual del acceso anterior cuando corresponda, compartir con la nueva cuenta y registrar otra concesión. No volver a cobrar ni alterar la identidad propietaria del pedido.
- Aleyda abre la carpeta concreta en Drive → **Compartir** → correo indicado → **Lector** → **Enviar/Compartir**. Mantiene **Acceso general: Restringido**. No usar «Cualquier persona con el enlace». Comprueba la cuenta destinataria y marca acceso concedido en administración.
- El servidor valida rol ADMIN y que existe permiso de lector para el destinatario exacto en esa carpeta antes de registrar GRANTED; guardar administrador, fecha y destinatario. La API solo **lee** permisos; su concesión/modificación automática queda para fase dos.
- En Mis compras, enlace del nombre pasa por una ruta del servidor que revalida sesión, pertenencia del pedido, pago COMPLETED, entitlement vigente y entrega GRANTED. Redirección sin caché solo a URL Drive construida desde ID privado conocido; no aceptar destino arbitrario. No revelar carpeta a anónimos, cuentas ajenas o entregas pendientes.
- Descatalogar no invalida compras ni consulta la condición comercial active para autorizar al comprador. Misma carpeta y archivos para compradores existentes; no eliminar ni reemplazar su carpeta vendida.
- Drive seguirá exigiendo autorización a quien reciba el enlace. Ocultar el enlace web no revoca permisos ya concedidos en Drive: cualquier retirada de acceso que ya exija el flujo existente debe incluir retirada manual en Drive y auditoría. No se modifican políticas de reembolso.

Fuente de botones/roles Drive: [ayuda oficial en español](https://support.google.com/drive/answer/7166529?hl=es). Sus nombres deberán contrastarse en la cuenta real durante QA; las nuevas etiquetas de nuestra web son propuestas.

## 5. Ejecución y pruebas tras autorización

1. Revalidar Git/despliegue; conservar documentos pendientes y crear rama nueva desde `cf90c687` (nombre propuesto `feat/digital-products-drive-preview`). Sin mover main ni alterar el Preview ya validado hasta tener candidato autorizado para QA. Preparar despliegue de rama aislado y callback/origen exactos.
2. Ejecutar `npm run local:check` antes de arrancar aplicación/Prisma. Confirmar Neon y Sanity de pruebas. Build Vercel ejecuta `prisma migrate deploy`: revisar migración aditiva y destino Preview antes de desplegar; no ejecutar migraciones Production. No basta con que el comando se llame build.
3. Superar primero la puerta de viabilidad de subida directa/reanudable y permisos con autorización personal de la propietaria. No avanzar con una solución que requiera pagar o exponer tokens.
4. Implementar integración por proveedor y entrega independiente, protecciones de privacidad y estados. Mantener sesiones/cursos/eventos/pasarelas anteriores sin cambio funcional.
5. Pruebas automáticas dirigidas: propiedad del pedido y rol admin; pago/entrega separados; revocación; idempotencia; callbacks PayPal repetidos; reintentos Bre-B/entrega; recuperación de subida sin duplicado; refs fuera de respuestas públicas. Tipos, lint y build con entorno seguro.
6. Preview, primero **375 px**: entrar con Aleyda en Studio de pruebas, subir PDF y audio sintéticos, interrumpir/reanudar uno, verificar ambos y su carpeta, publicar nueva ficha QA y comprobar catálogo/precios. Comparar tamaño/checksum del original y archivo obtenido. Probar límite propuesto y rechazo de exceso antes de anunciar tamaño máximo validado.
7. Bre-B simulado: pedido de prueba → pago pendiente sin enlace → confirmación admin sin enlace → compartir manualmente como lector → registrar acceso → título enlazado. Abrir ambos archivos con la cuenta Google compradora. Comprobar rechazo del mismo enlace con otra cuenta Google sin permiso y ausencia de enlace/API para otra sesión web/anónima.
8. PayPal sandbox: comprobar que pago confirmado también deja entrega pendiente hasta el mismo registro manual; completar entrega sin segundo cobro. Reutilizar pruebas anteriores donde no cambia comportamiento, pero no atribuirles QA Drive. Si sandbox requiere intervención, solicitarla; nunca hacer un cargo real.
9. Descatalogar ficha QA y publicar: fuera del catálogo; comprador mantiene enlace y acceso. Comprobar sesión existente y pruebas dirigidas de sesiones/entitlements sin crear reservas reales. Revisar escritorio después del móvil.
10. Comprobar que los lectores no pueden modificar archivos ni acceder a otra carpeta/producto; revisar también qué datos de otros lectores expone Drive antes de aprobar el modelo compartido. Si revela datos de compradores incompatibles con las políticas aprobadas, registrar bloqueo y proponer alternativa sin cambiar unilateralmente el modelo de una carpeta por producto.
11. Entregar URL aislada, SHA exacto, resultados reales y limitaciones, cuota disponible/bytes probados y guía de Aleyda basada en campos/botones observados. Cerrar QA retirando solo producto de pruebas de la venta, conservando compra/archivos como evidencia. Actualizar AUTONOMY_STATUS.md.

## Bloqueos / condiciones de cierre

1. Ejecución Preview aprobada. Autorización personal Google, generación segura de cliente Prisma y QA real pendientes; ver estado actualizado. No confundir aprobación de implementación con aprobación de Production.
2. Falta conexión OAuth personal de la cuenta propietaria y comprobación real de cuota, facturación deshabilitada, restricciones de compartir y permisos con `drive.file`.
3. Subida directa documentada pero CORS/reanudación desde Preview todavía no probados. Es una puerta de viabilidad, no un PASS.
4. Se necesitan dos cuentas Google de prueba y la intervención personal para conceder acceso/entrar y demostrar permitido/denegado. No guardar contraseñas ni sustituirlo por una simulación que se declare real.
5. Concesión manual implica tiempo de entrega también en PayPal; textos de compra/confirmación deben indicar acceso pendiente y no prometer entrega inmediata. No inventar plazo ni modificar política comercial sin revisión.
6. Resolver publicación/estabilidad OAuth y alojamiento comercial antes de lanzamiento. Google Drive puede evitar nueva cuota de almacenamiento si hay espacio y el proyecto cumple límites sin facturación; no acredita por sí solo coste cero del conjunto de la tienda.

## Ampliación aprobada: navegación y reembolsos

- Orden obligatorio: primero comprobar en móvil 375 px los recorridos **Bre-B COP simulado y PayPal USD sandbox**, pago confirmado sin enlace, permiso manual/registro de entrega y acceso privado; comprador autorizado y otra cuenta denegada. Después añadir navegación y comprobar el SHA final conjuntamente, reutilizando pedidos de prueba ya validados.
- Menú compartido de escritorio/móvil: Productos después de Academia → `/productos`; cerrar menú móvil al pulsar. Portada: bloque Productos digitales después del hero y antes del bloque de captación, botón Ver productos → `/productos`. Validar anchos intermedios sin solapamientos; no rehacer el menú.
- Reembolso total ya realizado/verificado: registro administrativo sin ejecutar dinero, invalidación en web y retirada Drive pendiente. Aleyda abre Compartir → destinatario → Quitar acceso → Guardar; servidor verifica y audita. Antes de retirar, comprobar otra compra válida del mismo producto/cuenta Google y conservar su acceso si corresponde. No borrar carpetas/archivos ni cambiar políticas comerciales. Probar con datos de Preview.
- La aplicación actual ignora notificaciones no aprobadas sobre pedidos completados: no asumir retirada automática por webhook de PayPal. Concesión y retirada automática vía API quedan para fase dos.
- Cierre: URL/SHA/resultados reales de ambos medios, subida y permisos, reservas, catálogo y navegación; guía con controles observados y pendientes de cobro real/configuración/consentimiento/presupuesto de Production.

**Punto seguro:** retomar el trabajo parcial del worktree y la aceptación personal de la política Google; superar el experimento de subida antes de dar por válida la solución. Production, main, dominio, facturación y cualquier migración de archivos existentes siguen pendientes de aprobación explícita para un candidato concreto.
