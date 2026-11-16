# Guía para Aleyda · Publicar y retirar productos digitales

Actualizada el 16/11/2026 para la entrega por Google Drive. Publicación, concesión automática y descargas de pago están verificadas en Preview. Los gratuitos se consultan en la web, sin descarga habilitada; la matriz de formatos y evidencia está en el plan de Drive. **Se utilizará en producción cuando Xavier apruebe el SHA concreto y se habilite la funcionalidad.** Esta guía no acredita pruebas en producción.

## 1. Entrar en el Studio correcto

Abre **https://energiaydivinidad.com/studio** e inicia sesión con la cuenta habitual de Aleyda y su proveedor habitual. Es el Studio integrado en la web de producción; no uses el Studio externo histórico para estas cargas. El rótulo previsto para el dataset real es **Energía y Divinidad — CONTENIDO REAL**. Si aparece **PRUEBAS — NO REAL** o el dominio empieza por `preview.`, estás en pruebas: no publiques allí un producto real. La dirección y el rótulo deberán comprobarse al habilitar producción; no se han validado en vivo como parte de esta entrega.

## 2. Crear la ficha

En **Structure**, entra en **Productos digitales** y usa **Create new document**. Completa **Nombre del Producto** y pulsa **Generate** en **Slug (URL)**. El slug será la última parte del enlace público. En **Tipo de Producto**, elige **Producto digital · cualquier formato** para una entrega de archivos sin módulos ni lecciones.

## 3. Portada y descripción

En **Imágenes del Producto**, pulsa **Add item** y añade la imagen. La primera imagen será la portada. Completa su **Texto Alternativo** con una descripción breve de la imagen. Escribe **Descripción Corta** (máximo 150 caracteres; aparece en el catálogo) y **Descripción Completa** (el contenido de la ficha). Explica qué recibe la persona y en qué formatos.

## 4. Precio y moneda

Para vender, deja **Acceso gratuito** en la opción de pago. Para regalar, selecciona **Gratuito · solo en línea** en una ficha nueva con archivos propios; no conviertas un producto vendido en gratuito ni reutilices sus referencias. Una ficha con pedidos asociados no puede servir sus archivos por la ruta gratuita.

En productos de pago, introduce importes numéricos positivos, sin el símbolo de moneda:

| Lo que quieres ofrecer | Campo | Método de pago que mostrará la ficha |
| --- | --- | --- |
| Solo pesos colombianos | **Precio (COP)**; deja USD vacío | Bre-B |
| Solo dólares | **Precio (USD)**; deja COP vacío | PayPal |
| Ambas monedas | Completa ambos campos | Bre-B en COP y PayPal en USD |

Ejemplo: `80000` COP y `20` USD. Son dos precios independientes: no hay conversión automática. Para vender debe existir al menos un precio mayor que cero. **Precio de Comparación (COP)** y **Precio de Comparación (USD)** son campos opcionales del precio original para mostrar descuentos; no sustituyen al precio de venta. En productos digitales deja **¿Controlar Inventario?** desactivado.

## 5. Adjuntar uno o varios archivos

En **Archivos para el comprador**, pulsa **Add item**. En el diálogo **Edit Archivo privado**, completa **Título del archivo** y, si hace falta, **Descripción**. Usa **Subir archivo** para elegir un archivo de tu ordenador. Mantén la ventana abierta hasta que termine **Subiendo archivo…** y aparezcan su nombre y tamaño. El máximo es **50.000.000 bytes por archivo (50 MB decimales)**. Si se interrumpe, vuelve a seleccionar el mismo archivo en el mismo elemento: se reanuda sin crear otra copia; no añadas otro elemento para reintentar. Espera a **Archivo verificado en su carpeta privada de Drive** antes de publicar. Si aparece un error de sesión o almacenamiento, no des por completada la carga.

Cierra el diálogo con **Close dialog** y repite **Add item** para cada archivo adicional. Cada entrada incorpora un archivo; puedes combinar PDF y audio en la misma ficha. Los archivos nuevos se guardan juntos en una carpeta privada de Drive por producto, reutilizada al añadir otros archivos. No compartas la raíz, no uses «Cualquier persona con el enlace» ni muevas/elimines los archivos vendidos. Los PDF y audios de pago permiten visualizar y descargar con permiso de lector. Los archivos Blob anteriores mantienen su entrega existente.

## 6. Publicar

En **Estado**, selecciona **Activo - A la Venta** y mantén **Publicado** activado. Espera a que se guarde el borrador y pulsa **Publish**. Si está deshabilitado, revisa **Validation** y completa lo que falte; no basta con guardar un borrador. Comprueba que Studio confirma la publicación.

## 7. Comprobar en la web pública

Abre **https://energiaydivinidad.com/productos**, recarga y busca el producto. Comprueba la portada, el nombre y la descripción corta. En un producto de pago, pulsa **Ver producto y opciones de pago**; su enlace termina en `/productos/` seguido de **Slug (URL)**. Revisa la descripción completa y **Método de pago**:

- Con COP debe aparecer **Bre-B · Global66** y el importe COP configurado.
- Con USD debe aparecer PayPal y el importe USD configurado.
- Con ambos, selecciona cada método y comprueba que el precio cambia a su moneda e importe correspondiente.

Revisa primero desde el móvil y después desde ordenador. Para revisar catálogo, precios y métodos no necesitas crear ni pagar un pedido.

El comprador debe usar una cuenta web con correo verificado y tener una cuenta Google con esa misma dirección. Con Bre-B, Aleyda verifica el ingreso y confirma el pedido desde Ventas; con PayPal, confirma el proveedor. Después el servidor intenta conceder lector únicamente en la carpeta del producto. En **Mis compras**, el nombre del producto abre Drive cuando pago y permiso están confirmados. Si aparece **Acceso pendiente**, se conserva el pago y se usa **Reintentar entrega**, sin volver a cobrar. En los productos históricos de Blob sigue apareciendo **Acceder**.

## Retirar de la venta conservando las compras

La acción exacta es **Productos digitales → abrir la ficha → Estado → Descatalogado → Publish**. Conserva **Publicado** activado, el documento publicado y todos sus archivos y permisos en Drive. El producto deja de venderse y los compradores anteriores mantienen su acceso desde **Mis compras → nombre del producto**, con su cuenta compradora; en Blob histórico, **Acceder**.

**No uses Unpublish ni elimines la ficha o sus archivos para retirarlo de la venta.** Tampoco desactives **Publicado** para este procedimiento. Aunque la ayuda de ese campo hable de visibilidad, la retirada que conserva la entrega se realiza con **Descatalogado → Publish**. Reemplazar un archivo cambia lo que reciben también los compradores anteriores; conservar los archivos evita retirarles parte de la entrega.

## Reembolsos y archivos gratuitos

El registro de reembolso en administración no devuelve dinero. Primero verifica que el reembolso total ya se ha realizado conforme a la política aprobada y registra su referencia. La web revoca solo el acceso de ese pedido y deja pendiente la retirada en Drive. Si otra compra válida del mismo producto conserva el permiso, **no lo retires**. En otro caso, retira únicamente a ese comprador de la subcarpeta del producto y verifica la retirada en administración. No cambies el acceso de la raíz ni de otros productos. Un archivo ya descargado no puede recuperarse del dispositivo del comprador.

### Publicar un gratuito desde Sanity

1. Crea una ficha nueva de **Producto digital · cualquier formato**, con portada y descripciones. En **Acceso gratuito**, selecciona **Gratuito · solo en línea**; no requiere precio ni checkout.
2. Añade sus propios archivos con **Subir archivo**, hasta 50 MB cada uno; espera la verificación de todos. No reutilices archivos o carpetas vendidos ni cambies sus permisos a mano.
3. Selecciona **Activo - A la Venta**, mantén **Publicado** y pulsa **Publish**. El catálogo mostrará **Gratis · solo en línea** y **Ver contenido gratuito**.
4. Abre la ficha primero en móvil y después en ordenador. PDF: lee todas las páginas con Anterior/Siguiente. Imagen: comprueba que se ve completa. Audio/vídeo: reproduce y pausa. No debe haber botón de descarga ni checkout.

Perfil previsto: **PDF de varias páginas, JPG/PNG, MP3, M4A/AAC y MP4/H.264+AAC**. WAV también tiene evidencia previa. El detalle de cada archivo probado está en el plan; una extensión no garantiza cualquier códec. EPUB y ZIP quedan fuera de la consulta gratuita online de este lanzamiento.

La aplicación aplica la política gratuita a esos archivos privados y los sirve en línea. Drive permanece **Restringido y solo propietaria**: no uses «Cualquier persona con el enlace» ni añadas lectores para los visitantes. El audio se reproduce con el reproductor web del regalo de newsletter, reutilizado y validado. La limitación del reproductor nativo de Drive con descarga bloqueada no exige cambiar de almacenamiento. La consulta online entrega bytes al navegador; ocultar controles de descarga no constituye DRM ni impide capturas o grabaciones.

### Destacados de portada

Activa **Destacado** y asigna **Orden en portada** en las fichas elegidas. Se muestran hasta cuatro activos y publicados en ese orden, sin rellenar con otros productos: una columna en móvil y cuadrícula de dos por dos en escritorio. Sin destacados la sección se oculta. Está después de **¿Cómo quieres comenzar?**, antes de **Sobre mí** y **Academia**. Cada tarjeta abre su ficha; **Ver todos los productos** abre `/productos`.

### Antes de Production

Esta guía no autoriza publicar. El procedimiento técnico, OAuth, alojamiento, costes y retirada manual tras reembolso están en [activación con Drive](activacion-productos-digitales-production.md). Xavier debe aprobar el SHA concreto y la configuración. Para practicar usa solo el dominio de Preview y los datos sintéticos identificados como NO REAL; no subas contenido real a Preview.
