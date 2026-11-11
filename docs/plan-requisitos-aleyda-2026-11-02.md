# Nuevos requisitos de Aleyda — plan para el 03/11/2026

Preparado el 02/11/2026. Estado: **plan pendiente de ejecución**. Xavier pide preparar hoy el trabajo y ejecutarlo mañana. No se programan acciones automáticas.

## Fuente y alcance

Fuente: `WhatsApp Audio 2026-11-02 at 01.16.07.opus`, de aproximadamente 64 segundos, transcrito localmente con MacWhisper. Se recoge el sentido del mensaje; no es una transcripción literal certificada.

| Tramo aproximado | Petición del audio |
| --- | --- |
| 00:00–00:24 | Redactar correos con facilidades parecidas a Gmail: añadir un enlace, añadir una foto y poder consultar los correos enviados. |
| 00:24–00:35 | Poder eliminar un usuario desde el panel. |
| 00:35–01:04 | Poder poner o completar el nombre de un usuario. Aleyda observa personas con solo correo, posiblemente relacionadas con invitaciones a eventos o registros incompletos. |

Estas peticiones son material para definir el trabajo. La instrucción vigente de Xavier autoriza únicamente preparar el plan hoy. El audio no autoriza enviar mensajes, borrar usuarios, modificar cuentas reales ni publicar una versión.

## Punto de partida comprobado en el repositorio

- Rama local `preview`, commit `52e9c8ea`, sin cambios pendientes de aplicación al comenzar. Hay cambios previos en `AGENTS.md` y cuatro documentos, que se conservan. Este plan es un archivo nuevo.
- Comunicaciones ya permite seleccionar destinatarios, escribir asunto/mensaje, previsualizar y enviar una prueba. El mensaje es un campo de texto; el servidor convierte las URLs escritas en enlaces. No hay controles de enlace con texto propio, imágenes o adjuntos.
- Existe «Campañas recientes», con las últimas 30 campañas, asunto, audiencia, estado y contadores. No permite abrir el contenido ni consultar el resultado por destinatario. Por tanto, hay que mejorar y revisar el historial existente, no crear un segundo sistema de envío.
- `EmailCampaign` conserva el cuerpo y `EmailCampaignRecipient` los destinatarios/resultados. `EmailLog` registra asunto, estado e identificador del proveedor; no guarda por defecto el HTML completo de todos los correos transaccionales.
- La ficha de usuario muestra el nombre y la actividad, pero la API individual inspeccionada solo implementa lectura. No hay edición de nombre ni eliminación en esa ruta.
- `User.name` es opcional. El registro ordinario ya exige nombre; la creación de cuenta tras compra como invitado admite nombre nulo. Es una posible explicación que habrá que contrastar, no el origen demostrado de los casos de Aleyda. Un destinatario introducido manualmente tampoco equivale necesariamente a una cuenta.

Inspección de código local: no se ha comprobado hoy el panel remoto ni la versión servida por Vercel. Antes de cualquier despliegue habrá que verificar equipo, proyecto, repositorio, SHA y dominios de EYD.

## Plan de implementación

### 1. Completar nombres desde Usuarios

- Añadir «Editar nombre» en la ficha y acceso visible desde la lista. Reutilizar el campo de nombre completo existente, sin imponer dos apellidos ni deducir nombres del correo.
- Guardado exclusivo para ADMIN comprobado en servidor, con validación de longitud/espacios y registro de auditoría. La operación no modifica correo, contraseña, verificación, rol ni permisos.
- Reflejar el nombre actualizado en ficha, búsqueda y futuras comunicaciones. Conservar los datos históricos de destinatarios y documentos ya emitidos.
- Añadir un filtro «Sin nombre» para localizar los casos pendientes.
- Reproducir con datos ficticios los caminos de registro, compra como invitado e invitación/destinatario manual. Corregir el origen que se identifique dentro del alcance; no modificar el procesamiento de pagos por una hipótesis.

Aceptación: editar y recargar conserva el nombre; se encuentra por búsqueda; un cliente no puede editar a otra persona; no cambia ningún acceso ni se envía un correo por guardar el nombre.

### 2. Abrir y consultar los correos enviados

- Hacer accesible el historial desde Comunicaciones y permitir abrir una campaña con asunto, mensaje, enlaces, imágenes/adjuntos y audiencia utilizada.
- Mostrar resultados por destinatario: pendiente, enviado al proveedor, fallido u omitido, con fecha y explicación útil del fallo. Incorporar paginación y filtros por fecha/estado, evitando el límite visible de 30 como único acceso.
- Diferenciar aceptación por el proveedor de entrega confirmada. No mostrar «Entregado» si solo se dispone de `SENT`.
- Conservar una versión del contenido enviado y sus recursos para los mensajes nuevos. Una edición posterior del nombre, plantilla o imagen no debe reescribir el historial.
- Para campañas antiguas, mostrar el cuerpo guardado y señalar si la presentación se reconstruye con la plantilla actual. No prometer una copia exacta inexistente.
- Mantener acceso ADMIN tanto en página como en API. Abrir un correo es solo lectura y no vuelve a enviarlo.

Aceptación: tras un envío de prueba autorizado se puede abrir su contenido y ver el resultado; una recarga no duplica envíos; el historial sigue disponible al superar 30 campañas; usuarios sin permisos no pueden consultar mensajes ni destinatarios.

### 3. Redactar con enlaces y fotos

- Añadir controles sencillos «Insertar enlace» y «Añadir foto», con vista previa. Mantener logo, colores y estructura de los correos actuales de EYD.
- Enlaces con texto visible y URL validada; imágenes con texto alternativo, tamaño adaptado a móvil y opción de retirarlas antes de enviar.
- Resolver la duda sobre foto insertada y/o archivo adjunto antes de cerrar el modelo. Si se necesitan adjuntos, mostrar nombre, tamaño y opción de quitar; validar formato y límites tanto al cargar como al enviar.
- Reutilizar el servicio de correo y la entrega protegida existentes. Revisar el almacenamiento disponible antes de elegir dónde guardar archivos; no hacer públicos documentos privados ni incorporar archivos al repositorio.
- Conservar el escape de contenido y admitir únicamente el formato necesario. Evitar HTML arbitrario, enlaces ejecutables y lectura de URLs de archivo sin controles del servidor.
- Guardar contenido/recursos con la campaña y utilizarlos de forma consistente en la vista previa, la prueba y el envío final. Mantener compatibilidad con mensajes antiguos de texto.
- Si se necesita ampliar el esquema, preparar una migración aditiva y probarla únicamente en Neon Preview.

Aceptación: enlace clicable e imagen correcta en el correo recibido; vista móvil legible y logo original conservado; archivo inválido rechazado antes del envío; recursos disponibles al consultar el historial; ningún envío a destinatarios reales durante QA.

### 4. Eliminar usuarios con una decisión explícita sobre su efecto

- Antes de implementar la acción, concretar si Aleyda quiere quitar un registro duplicado/erróneo, archivarlo del listado o eliminar definitivamente la cuenta. El archivo reversible es una propuesta, no un sustituto ya aceptado de «eliminar».
- Revisar dependencias: pedidos, reservas, accesos, membresías, preferencias, progreso y comunicaciones. Preparar un resumen del impacto antes de confirmar cualquier operación.
- No convertir un borrado en cancelación de pagos, reembolso o retirada silenciosa de servicios. Si existe un acuerdo recurrente, la operación necesita resolución expresa y no basta con borrar una fila local.
- Proteger al administrador actual y al último ADMIN; autorización en servidor, confirmación identificando a la persona y auditoría. Evitar cascadas que destruyan historiales relacionados.
- Para archivo, definir si solo oculta del listado o también bloquea acceso/envíos y cómo se restaura. Para eliminación definitiva, definir qué se conserva, desvincula o anonimiza antes de habilitarla.
- Probar exclusivamente con usuarios ficticios propios. No elegir una cuenta real para comprobar el botón.

Aceptación: el efecto elegido se explica antes de confirmar; no se puede borrar por accidente al último administrador; se preservan los historiales acordados y no se disparan cobros, devoluciones ni mensajes; la restauración funciona si se elige archivo.

## Dudas para resolver al retomar mañana

1. **Fotos y adjuntos:** ¿foto dentro del mensaje, adjunto descargable o ambas opciones? El audio no lo distingue. No se deduce que necesite PDF, audio u otros formatos.
2. **Historial:** primera entrega propuesta para los correos enviados desde Comunicaciones. Confirmar si también quiere abrir confirmaciones automáticas de compras/reservas y otros transaccionales; tienen datos históricos distintos.
3. **Eliminar:** precisar el efecto deseado y el tratamiento de usuarios con actividad o membresía. Hasta decidirlo, continuar las tareas de nombre, historial y redacción.
4. **Casos sin nombre:** pedir un ejemplo de la pantalla o recorrido al que se refiere, si las pruebas ficticias no permiten identificarlo. No extraer listados de clientes para investigar.

## Orden de trabajo y verificación

1. Revisar rama/estado y preservar cambios previos; resolver las dudas anteriores con Xavier al retomar.
2. Implementar edición de nombre y diagnóstico de registros incompletos.
3. Mejorar historial sobre los modelos existentes; después incorporar enlaces/fotos y sus recursos al mismo historial.
4. Implementar la acción de usuario acordada, revisando sus dependencias antes de cualquier migración.
5. Ejecutar pruebas relevantes de permisos, validación, persistencia, historial, efectos de archivo/eliminación e integridad de los envíos. Ejecutar suite Preview, tipos, lint y compilación protegida según los cambios.
6. Desplegar solo Preview, verificar Ready y SHA servido, y revisar móvil/escritorio en `https://preview.energiaydivinidad.com`. Probar correo únicamente a `aleydapaola@proton.me`, con `[PREVIEW]`, preservando las protecciones existentes.
7. Entregar enlace y resultados: qué se ha comprobado, qué depende de proveedor/intervención personal y qué queda pendiente. Solicitar aprobación de la versión concreta antes de integrar o publicar Production.

## Límites y relación con otros pendientes

- Este plan no modifica pagos, precios, políticas comerciales ni membresías; tampoco repite las compras sandbox ya validadas.
- El regalo de meditación y la automatización de newsletter siguen en `docs/newsletter-preview.md`. Mejorar Comunicaciones no implica activar esa entrega, contratar un plan ni modificar Mailchimp Production.
- No se envían mensajes a Aleyda por preparar el plan. No se conecta otro proyecto, equipo, cuenta ni credenciales de Amor Sanación Alquimia.
- Hoy solo se ha creado este documento. No se han cambiado aplicación, base de datos, CMS, proveedores ni despliegues; no se han ejecutado tests de una implementación inexistente.

## Archivos previstos para la ejecución

- Usuarios: `app/admin/users/AdminUsersList.tsx`, `app/admin/users/[id]/page.tsx`, `app/api/admin/users/[id]/route.ts` y servicios de autorización/auditoría correspondientes.
- Correos: `app/admin/communications/*`, `app/api/admin/communications/*`, `lib/services/email-campaigns.ts`, `lib/email.ts` y `lib/email-delivery.ts`, conservando la frontera de destinatarios de prueba.
- Datos: `prisma/schema.prisma` y migración aditiva solo si el diseño acordado la requiere; pruebas específicas junto a la suite existente.
