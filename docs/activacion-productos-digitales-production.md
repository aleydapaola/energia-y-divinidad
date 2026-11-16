# Activación de productos digitales con Google Drive en Production

Actualizado: 16/11/2026. **Propuesta para revisión; no autoriza publicar, configurar Production ni contratar servicios.** Repositorio `aleydapaola/energia-y-divinidad`, equipo `aleyda-paola-vargas-projects`, proyecto `energia-y-divinidad`.

## Candidato y evidencia

- Rama de trabajo: `feat/digital-products-drive-preview-20261115`; publicación de pruebas exclusivamente en `preview`.
- Base funcional acreditada: `884aa0a31476d8c111270994682d39044caaf280`, Ready `dpl_HXt5kr9oiPEMgWJuxecD6bHMJiYG`.
- Código funcional final verificado: `3eecca84b55d2295a104e185732432b1f9fa0d41`, Ready `dpl_G9HxbjVmg6WBQst3U2MEYmQEjciD`, https://energia-y-divinidad-1889g1c5u-aleyda-paola-vargas-projects.vercel.app y alias Preview contrastados. Incluye portada vacía aislada/test PayPal-Drive de `1c34b30b` y soporte del MIME M4A observado. El SHA del candidato final incluye estos documentos y se contrasta con HEAD, remoto y Ready al cerrar; ver AUTONOMY_STATUS.md y el mensaje de aprobación del SHA exacto. Los commits documentales posteriores no cambian la aplicación comprobada.
- Producción observada en solo lectura el 16/11: dominio raíz/www → Ready `dpl_CSsUCQrLQvH7A6jWPGmicRViPjWP`; main remoto `5d1b19f67c3abbc136864121aea40525f134bb17`. Es una referencia para preparar revisión/reversión; revalidar justo antes de cualquier publicación autorizada.
- Se reutilizan compras Bre-B QA-DRIVE-001, único PayPal Sandbox de 20 USD, PDF/audio descargados y hashes, reader automático/Restringido, negativas, reintento, reembolsos y navegación. QA nueva y resultado exacto por formato: plan-productos-digitales-drive.md y AUTONOMY_STATUS.md. No repetir pagos ni descargas para recuperar contexto.

El procedimiento anterior Blob/500MB se conserva en [histórico](historico-activacion-productos-blob-20261114.md). Los productos históricos Blob mantienen su proveedor y acceso. Los archivos nuevos usan Drive privado; no hay migración automática de archivos comprados.

## Alcance de archivos y descarga

**Límite vigente de Drive: 50.000.000 bytes por archivo (50 MB decimales, aproximadamente47,7MiB).** Es la constante `DRIVE_MAX_BYTES` del código; no requiere una variable de límite nueva. No confundirla con el límite del proveedor histórico Blob.

Perfil de lanzamiento delegado por Xavier: PDF (incluido multipágina), imágenes JPG/JPEG yPNG, audio MP3 yM4A/AAC, vídeo MP4/H.264+AAC. WAV/MP4 ya tenían evidencia reutilizable. EPUB/ZIP no forman parte de la lectura gratuita online de este lanzamiento. Los nombres de extensión no garantizan todos los códecs posibles; la QA se limita a los archivos/códecs documentados y al navegador probado.

- Comprados: pago confirmado + titular web con correo verificado → lector automático solo en la carpeta del producto → Mis compras → PDF/audio descargables. Carpeta sigue Restringida.
- Gratuitos: ficha nueva con pricing.isFree, archivos propios verificados y sin pedidos asociados → lectura/visión/escucha en la web, sin controles de descarga. Drive queda solo propietaria/Restringido; servidor entrega media inline/rangos. El reproductor nativo de Drive tiene la limitación conocida de audio; se usa el reproductor web validado. Deshabilitar controles no constituye DRM.

## Configuración pendiente de validar en Production

| Elemento | Configuración objetivo | Estado de esta preparación |
| --- | --- | --- |
| Neon | Base EYD de Production independiente; conexión y migraciones revisadas | No se han consultado credenciales ni ejecutado migraciones de Production. |
| Sanity | Proyecto 81jpalr2, dataset production; Studio/dominio/CORS/rol editorial correctos | Validación de Production pendiente; los fixtures permanecen enpreview. |
| Drive/OAuth | Cliente web propio de Production, separado de Preview y del login comprador/Calendar; scope únicamente drive.file | Consentimiento, publicación, dominio y conexión propietaria pendientes de aprobación/configuración. |
| Raíz Drive | Nueva raíz privada de Production, propietaria aprobada, sin público/dominio/grupos; conexiónenvironmentproduction | Creación/conexión pendiente; no reutilizar conexión cifrada ni carpetasQA. |
| Alojamiento | Plan que admita el uso comercial y capacidad aprobada | Plan/coste real de la cuenta y decisión pendientes; no se ha cambiado plan ni activado facturación. |
| Servicios existentes | Autenticación, correo, PayPal/Bre-B y Blob histórico con configuración Production propia | Revisión de ámbitos/destinos pendiente; no copiar credenciales, destinatarios ni modosQA. |

Variables privadas del nuevo proveedor, **solo ámbitoProduction**, según `lib/digital-products/drive-config.ts`:

| Variable | Valor o condición a validar |
| --- | --- |
| DIGITAL_PRODUCTS_DRIVE_ENABLED | true, tras aprobar y preparar OAuth/variables; antes de conectar desde administración. No publicar fichas reales hasta completar conexión/readiness |
| DIGITAL_PRODUCTS_DRIVE_CLIENT_ID | Cliente OAuth web aprobado de Production |
| DIGITAL_PRODUCTS_DRIVE_CLIENT_SECRET | Secreto de ese cliente, entrada por gestor seguro |
| DIGITAL_PRODUCTS_DRIVE_OWNER_EMAIL | Cuenta propietaria que Xavier/Aleyda aprueben |
| DIGITAL_PRODUCTS_DRIVE_ENCRYPTION_KEY | Clave independiente de 32 bytes en Base64; custodiar/respaldar para descifrar conexión; rotación exige plan de reconexión |
| DIGITAL_PRODUCTS_DRIVE_ORIGIN | https://energiaydivinidad.com (o www si es el origen canónico aprobado) |

Registrar en el cliente el callback exacto `{ORIGIN}/api/admin/product-drive/callback`. Conservar las variables `PREVIEW_DIGITAL_PRODUCTS_DRIVE_*` en Preview. Servidor comprueba proyecto/dataset/origen y no hace fallback de credenciales entre entornos. Los secretos no se guardan en Sanity, Git, documentos ni chat.

## OAuth estable y costes: decisiones aún pendientes

- **OAuth:** una app External/Testing con Drive entrega refresh tokens con caducidad de 7 días. Antes de vender, validar Audience/publicación, branding/dominios, alcances y cualquier verificación que Google exija para el caso aprobado; no ampliar scopes por iniciativa propia. Documentar reconexión administrativa por expiración/revocación. Pasar a In production y aceptar consentimiento son acciones pendientes de autorización; la propietaria completa personalmente el acceso/2FA. [GoogleOAuth](https://developers.google.com/identity/protocols/oauth2#expiration).
- **Alojamiento:** Hobby está reservado a uso personal/no comercial. La tienda requiere decidir un plan compatible o una alternativa validada antes de publicar comercialmente. Vercel Pro publica una base de20 USD/mes, un puesto de despliegue y 20 USD de crédito; consumo adicional/puestos/add-ons/impuestos pueden aumentar el total. No es un presupuesto cerrado ni autorización de contratación. [Condiciones](https://vercel.com/legal/terms), [Pro](https://vercel.com/docs/plans/pro-plan).
- **Drive:** el uso estándar deAPI figura sin coste adicional; Google anuncia cobros por exceso y cambios de cuotas durante 2026. Verificar cuota efectiva del proyecto, facturación, capacidad/espacio disponible y condiciones vigentes antes de activar Production. No inferir coste cero ilimitado ni asociar tarjeta, activar facturación o aumentar cuota sin aprobación. [Límites/precioDrive](https://developers.google.com/workspace/drive/api/guides/limits).
- **Presupuesto total:** cerrar tamaño de biblioteca, reproducciones/descargas mensuales, almacenamiento, cuotasAPI, Functions/transferencia de gratuitos, Neon/Sanity/correo y comisiones de pasarela aplicables. La reproducción gratuita atraviesa el servidor y puede consumir transferencia/ejecución del alojamiento; la compra de pago enlazaDrive. No se ha medido ni cotizado un volumen comercial ni contratado nada en este pase.

Fuentes oficiales reconsultadas el 16/11/2026. Importes en USD, no incluyen un total de impuestos/consumos. La configuración efectiva de facturación/plan de Production no se ha modificado.

## Orden de activación, solo después de aprobación específica

1. **Cerrar candidato.** Presentar SHA exacto, PreviewReady/alias, matriz QA y estas condiciones. Recibir aprobación explícita de Xavier para ese commit, su configuración, migración y cualquier gasto. Si cambia código/configuración/importe autorizado, presentar de nuevo el cambio concreto.
2. **Revalidar destino.** Comprobar repo/equipo/proyecto, ramas/remotos, dominio canónico y despliegue Production anterior. Registrar recuperación. Mantener archivos y compras existentes.
3. **Preparar servicios independientes.** Cerrar alojamiento/presupuesto; validar Neon/Sanityproduction, cliente/callbackOAuth, propietaria y variables privadas propias. Estos pasos siguen pendientes y no se ejecutan por tener QA aprobada.
4. **Revisar migraciones antes del build.** Respecto al main observado, la migración nueva es `20261115000100_product_drive`: cuatro tablas, enum, índices yFK aditivos. Revisar también qué consta aplicado en la base autorizada y detenerse ante migraciones ajenas no aprobadas. El build `vercel-build` ejecuta generación Prisma → `scripts/migrate-vercel.mjs`/migrate deploy → Next. No ejecutar migraciones administrativas locales ni asumir que ReadyPreview valida la base real.
5. **Publicar solo el commit aprobado.** Integrar por la vía Git habitual preservando historial y cambios; verificar ancestro/conflictos. Si la integración produce otro SHA, pedir aprobación de ese candidato. El build debe ser Production con sus propios valores, no una promoción del artefacto de Preview.
6. **Conectar Drive de Production personalmente.** Administración→Archivos de productos→conexión propietaria. Completar consentimiento/2FA con la cuenta aprobada y crear la raíz privada de Production mediante la aplicación. Confirmar entorno/raíz/propietaria/Restringido/readiness. No registrar tokens ni compartir la raíz.
7. **Comprobar despliegue y configuración.** Ready/SHA/dominioProduction; Studio usa producción y rótulo correcto; readiness de Drive informa 50.000.000. Navegación375px primero/escritorio después, sin altas/cobros/QA en datos reales.
8. **Primera carga editorial real, solo con autorización.** Aleyda elige ficha/archivo real, comienza borrador y comprueba persistencia/verificación/privacidad antes de publicar. Si no se autoriza esa carga, declarar únicamente despliegue/configuración comprobados y primera carga real pendiente. Una compra/cobro real requiere autorización aparte y no forma parte del smoke.

## Reembolso: retirada manual que debe realizar Aleyda

1. Comprobar el reembolso total ya efectuado según la política aprobada. El botón de administración **no devuelve dinero**; registra referencia, revoca únicamente el entitlement del pedido y deja `PENDING_REVOCATION`.
2. Revisar si otra compra válida del mismo producto/cuenta mantiene acceso. Si la aplicación lo indica, **conservar el permiso** y verificar esa situación en administración.
3. Si no hay otra compra válida: abrir **la subcarpeta del producto** en Drive→Compartir→correo del comprador→Quitar acceso→Guardar. Mantener acceso general Restringido y los permisos de otros compradores/productos.
4. Volver al pedido→marcar revisión→**Verificar retirada de acceso**. El servidor comprueba el permiso y audita `drive_revoke`; si el reader continúa y ninguna compra lo conserva, rechaza cerrar la retirada.
5. Registrar pedido/ref/resultado. Conservar carpeta y archivos. Un archivo ya descargado permanece en el dispositivo comprador. Esto aplica la política aprobada, no la modifica.

La concesión después del pago es automática. La retirada por reembolso es **manual y verificada**, no automática. Ambos casos y la conservación por otra compra están acreditados enQA; reutilizar evidencia.

## Recuperación y punto de parada

Ante fallo de build/migración/conexión, detener activación y registrar fase. La reversión al despliegue anterior requiere la autorización correspondiente y no debe borrar archivos/pedidos ni revertir migraciones a ciegas. Cualquier desconexión/rotaciónOAuth debe preservar la capacidad de recuperación de la conexión cifrada.

**Punto de parada actual: candidato listo para revisión en Preview; Production/main/configuración real/gastos siguen sin autorización. Esperar aprobación del SHA concreto.**
