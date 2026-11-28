# Plan maestro de Comunicaciones de Energía y Divinidad

**Estado · Propuesta para aprobación.** Aleyda podrá redactar, enviar, programar y consultar campañas desde el panel de administradora. La primera entrega incluye adjuntos descargados directamente desde Google Drive. Las secuencias activadas por compras o suscripciones quedan para una fase posterior.

El [plan de captación de newsletter](PLA_MESTRE_NEWSLETTER.md) documenta altas y formularios. Este documento es el plan maestro de campañas y toma de ese circuito las bajas aplicables.

## Dónde se guarda cada cosa

**Requisito obligatorio vigente. Queda totalmente prohibido usar recursos de pago para almacenar archivos de Comunicaciones.** Google Drive es el único destino autorizado y se usará dentro de la capacidad gratuita disponible, sin contratar ni ampliar almacenamiento de pago. Si se agota esa capacidad, se detendrá la subida y el panel informará del motivo. La prohibición de almacenar archivos en Vercel abarca Vercel Blob y cualquier copia temporal o intermedia, incluso en un tramo gratuito. La base de datos habitual conserva los datos operativos y las referencias.

- **Google Drive** guarda los archivos que Aleyda suba desde Comunicaciones, incluidos PDF, otros adjuntos aprobados y nuevas imágenes que se decida admitir. Se guardan directamente en Drive como destino persistente. El panel conserva referencias y el botón **Descargar** usa el enlace directo de Drive.
- **La base de datos habitual** guarda borradores, asunto, texto, referencias a imágenes y adjuntos, destinatarios, programación, historial, estados y eventos de entrega. Los registros pueden incluir el ID de Drive, nombre, tamaño y enlace del archivo.
- **Las imágenes públicas que ya existen en Sanity** se pueden reutilizar por referencia. No hace falta copiarlas ni migrar los archivos existentes de otros módulos. Las imágenes nuevas que se suban desde Comunicaciones deberán disponer de una URL apta para mostrarlas en los clientes de correo antes de habilitar esa carga.

## Avance y trabajo restante

Base auditada: checkout local `preview` en `75edba4c` con cambios pendientes y referencia local `origin/preview` en `89698d7f`. Son referencias de código. El SHA activo de Preview está pendiente de revalidación.

| Capacidad de entrega | Estado | Implementado y trabajo pendiente |
|---|---|---|
| 1. Redacción y borradores | Parcial | Plantilla, asunto y texto con enlaces automáticos. Faltan borradores persistentes, enlaces editables, imágenes públicas de Sanity y texto alternativo. |
| 2. Prueba y vista previa móvil | Parcial | Envío de prueba y redirección al buzón autorizado de Preview. Falta previsualizar a 375 px con la misma plantilla final, fotos y adjuntos. |
| 3. Adjuntos de Drive | Pendiente | Existe infraestructura en productos. Comunicaciones necesita carga, progreso, retirada, reintento, comprobación y descarga sin sesión. |
| 4. Audiencias y confirmación | Parcial | Selección individual múltiple, direcciones manuales, todos los usuarios y un curso, una membresía o un evento por campaña. Hay deduplicación y recuento. Falta combinar grupos y personas y confirmar una lista exacta. |
| 5. Envío inmediato fiable | Parcial | Persistencia de destinatarios y procesamiento por lotes. Faltan reserva atómica, idempotencia y tratamiento de fallos parciales y ambiguos. |
| 6. Fecha, hora y gestión | Pendiente | El cron diario procesa la cola. Faltan fecha, hora, zona, reprogramación y cancelación. |
| 7. Bajas antes del envío | Pendiente | El procesador de campañas necesita consultar la fuente de bajas antes de llamar al proveedor. |
| 8. Historial administrativo | Parcial | Lista de hasta 30 campañas con asunto, audiencia, totales y fechas disponibles. Faltan detalle, copia del mensaje y estados programado y cancelado en el recorrido. |
| 9. Estado por destinatario | Parcial | La base guarda resultados de envío e identificador de proveedor cuando existe. Faltan detalle individual, entregas, rebotes y conciliación por webhook. |

**Balance · 6 de 9 capacidades tienen base reutilizable y 3 están pendientes. Ninguna de las 9 está cerrada con el alcance completo.** Es un recuento funcional, sin equivalencia directa con esfuerzo. Las cinco pruebas de aceptación de la propuesta siguen pendientes de ejecución en Preview.

## Subplanes y orden de ejecución

### A. Borradores, plantilla y prueba

- Reutilizar el panel, la plantilla y el envío de prueba. Añadir creación y edición de borradores. Definir un formato pequeño de bloques de texto, enlace e imagen. Evaluar reutilizar Portable Text y el selector de imágenes de Sanity. Conservar compatibilidad con cuerpos antiguos de texto plano.
- Renderizar los mismos bloques en la vista previa, la prueba y el envío final. Validar URL, escapar el contenido y exigir texto alternativo en las fotos. Añadir vista previa a 375 px. Para los correos sujetos a consentimiento, incorporar el mecanismo de baja vigente y verificarlo en el mensaje de prueba (A2).
- Cierre: guardar y recuperar un borrador, insertar enlace y foto y comprobar el resultado en una prueba redirigida al buzón autorizado.

### B. Adjuntos y descarga directa de Google Drive

- Reutilizar el cliente y las utilidades de carga Drive de productos cuando encajen. Usar una carpeta de campañas dedicada y separada de productos, con cuentas y carpeta propias de Preview. Al elegir un archivo, crear su registro en el borrador y subirlo automáticamente. Mostrar progreso, error, reintento y retirada. Conciliar cargas interrumpidas para evitar copias huérfanas o duplicadas.
- Mantener la carpeta privada. Configurar por archivo permiso de lectura por enlace sin descubrimiento, sujeto a la política de la cuenta. Mostrar el aviso «Cualquier persona que reciba el enlace podrá descargar el archivo». Guardar ID, nombre, tamaño y `webContentLink` devuelto por Drive, con su clave de recurso cuando venga incorporada. El botón **Descargar** enlazará directamente a esa URL de Google Drive.
- B2 prepara la comprobación de archivo, carpeta, permiso y disponibilidad de descarga. D1 y D2 la aplican al confirmar y al despachar, también si el archivo ha cambiado desde la confirmación. Si falta el archivo, pierde el permiso o Drive no permite verificarlo, detener el despacho pendiente y mostrar el motivo. Si ya hubo entregas, conservar sus resultados.
- Mantener el archivo de cada envío como versión estable. Un reemplazo crea otro archivo. Retirar un adjunto de un borrador permite limpiar un archivo sin referencias, conservando los que estén vinculados a campañas programadas o enviadas.
- Validar primero la carga reanudable directa del navegador a Drive que ya usa productos en la referencia local `origin/preview`. El panel inicia y valida la sesión y el navegador transfiere los bytes a Drive. Reutilizar las utilidades de sesión y verificación que encajen, con carpeta privada y permisos por archivo propios de Comunicaciones. Probar un PDF representativo en una cuenta de prueba con capacidad gratuita y fijar el tamaño máximo tras esa prueba. Si la ruta directa o la descarga anónima no se pueden validar, B queda pendiente dentro de las restricciones de almacenamiento vigentes.
- Cierre: seleccionar, subir, retirar y reintentar un PDF en el panel, y descargarlo desde un correo a 375 px sin cuenta de Google ni sesión de la web. Confirmar que el enlace anterior sigue funcionando tras reemplazar el PDF y desplegar otra versión.

Fuentes: [Descargas en Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [carga reanudable](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [permisos de Drive](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions).

### C. Audiencias, bajas y confirmación

- Ampliar el resolutor existente para combinar grupos actuales y usuarios. Unificar por correo normalizado y mostrar origen, exclusiones y total. Incorporar un grupo manual guardado solo si curso, membresía y evento no cubren el uso aprobado.
- Vincular la confirmación al conjunto completo de correos normalizados, incluidas las direcciones que queden fuera de la muestra de pantalla. Validar que el conjunto coincide y guardar la lista exacta y su composición en la misma operación. Si cambia cualquier dirección, mostrar la selección actualizada y pedir confirmación de nuevo aunque el total coincida. Las altas posteriores en un grupo quedan fuera del envío. Las salidas del grupo siguen en la selección confirmada, sujetas a comprobación de bajas.
- Validar en 0.3 la consulta de lectura del estado del destinatario en la audiencia autorizada de Mailchimp. Aplicar la política de consentimiento vigente según el tipo de campaña. Para las campañas sujetas a consentimiento, comprobar el estado justo antes de cada intento que pueda iniciar un envío, incluidos los reintentos. Una baja se registra como omitida. Un estado sin consentimiento verificable excluye al destinatario según la política acordada. Ante timeout o error transitorio, aplazar la fila y mostrar el motivo. C2 prueba estas decisiones con respuestas controladas y D1 conecta la comprobación al despacho real.
- Cierre: dos grupos que se solapan y una selección individual producen una fila por correo. Una baja posterior a la confirmación queda omitida al despachar.

### D. Envío inmediato y programado

- Documentar en 0.3 la comparación con `scheduledAt` del método de Resend que usa el proyecto. Admite programar con hasta 30 días de antelación y reprogramar o cancelar por mensaje. Una solicitud anticipada delega el envío a Resend y deja una carrera entre una baja de última hora y el envío. La propuesta mantiene la programación en la aplicación y llama a Resend después de comprobar las bajas. El cron diario clásico del repositorio no activa campañas en Preview. Validar en 0.3 que un disparador autorizado puede invocar una comprobación autenticada con la cadencia acordada, sin enviar correos. D2 prueba el despacho automático completo.
- Unificar **Enviar ahora** y **Programar envío** en la misma cola. Guardar instante UTC y zona IANA, validar fechas pasadas y horas ambiguas por cambio horario, y mostrar fecha, hora, zona y total en la confirmación. Mantener el contenido y la audiencia confirmados al reprogramar. Medir la tolerancia desde el instante previsto hasta la aceptación de Resend para los destinatarios elegibles, y comprobar por separado la llegada al buzón. Registrar por separado los aplazamientos por bajas o adjuntos pendientes de verificar.
- Reservar cada destinatario antes de despachar. Una transición atómica inmediatamente anterior a la llamada autoriza el intento si siguen vigentes la campaña, el horario y la reserva. Si la cancelación gana esa transición, se impiden los intentos nuevos y los reintentos. Si el intento ya quedó autorizado, puede completarse y el panel conserva su resultado. Reprogramar invalida el horario y las reservas anteriores mientras el despacho no haya empezado. Si ya hay un intento autorizado, mostrarlo y rechazar la reprogramación de esa campaña.
- Guardar por destinatario la petición de envío, la clave de idempotencia estable, la hora del primer intento y el resultado. Reutilizar la misma clave y la misma petición al reintentar una fila elegible dentro de las 24 horas. Un fallo parcial conserva las filas aceptadas y permite reintentar solo las elegibles. Si se desconoce el resultado y caduca la ventana, hay una baja o se cancela la campaña, conciliar el intento anterior sin iniciar otro envío.
- Cierre: una campaña parcial muestra éxitos, fallos y pendientes. El reintento de un timeout, dos procesadores simultáneos, una reprogramación y una cancelación no causan envíos duplicados. Probar con reloj controlado y luego con programación real en Preview.

Fuentes: [Programación de Resend](https://resend.com/changelog/extended-email-scheduling), [ventana de idempotencia](https://resend.com/changelog/batch-idempotency-keys).

### E. Historial, seguimiento y cierre

- Ampliar el historial con filtros y detalle administrativo. Guardar la versión confirmada con asunto, audiencia, fechas prevista y real, zona, contenido, enlaces, nombres de archivos y totales. Exponer pendiente, aceptado, entregado, rebotado, fallido y omitido por baja o cancelación.
- Añadir el webhook de Resend y comprobar que un evento legítimo llega al Preview protegido mediante una configuración autorizada para esa ruta. Verificar firma y timestamp sobre el cuerpo original, guardar el ID único del evento y conciliarlo con el ID del mensaje, incluso si llega antes de persistir la respuesta del proveedor. Aplicar transiciones según tipo y fecha para tolerar duplicados y eventos fuera de orden. Recuperar el historial local y consultar qué resultados anteriores siguen disponibles por ID en Resend. Si solo consta aceptación, conservarla y mostrar el estado de entrega como desconocido.
- Cierre: una administradora puede abrir el detalle, comprobar cada destinatario y seguir descargando archivos históricos. Un usuario sin permisos recibe acceso denegado. Validar eventos repetidos, desordenados y con firma inválida.

## Lista de ejecución y control de alcance

Completar cada fila con el cambio mínimo que satisfaga su prueba. Registrar ID, estado, SHA, entorno y evidencia en AUTONOMY_STATUS.md. Una tarea está cerrada cuando su prueba de cierre pasa. La puesta en marcha de cada fase depende de las filas indicadas. Las investigaciones de la fase 0 se limitan a resolver dependencias de esta entrega.

| ID | Depende de | Tarea delimitada | Prueba de cierre |
|---|---|---|---|
| 0.1 | Aprobación del plan | Revalidar rama, despliegue, aislamiento y protecciones de Preview. Preservar los cambios locales. | Base y servicios de prueba identificados sin exponer credenciales. |
| 0.2 | 0.1 | Validar carga directa reanudable, capacidad gratuita y permisos por archivo en Drive con un PDF representativo. | Los bytes van a Drive y el PDF abre sin sesión. Quedan registrados el espacio disponible y un límite de tamaño viable. |
| 0.3 | 0.1 | Comprobar la consulta de bajas en la audiencia de prueba y la cadencia del disparador autorizado. | Una consulta de lectura y una invocación autenticada de prueba confirman la viabilidad en Preview. El envío automático se prueba en D2. |
| A1 | 0.1 | Guardar y editar borradores con migración aditiva y lectura de cuerpos antiguos. | Una campaña anterior se sigue leyendo y un borrador nuevo se recupera al recargar. |
| A2 | A1 | Añadir enlaces, imágenes públicas de Sanity con texto alternativo y mecanismo de baja aplicable. Compartir plantilla entre vista previa, prueba y envío. | El enlace, la foto y la baja aplicable se comprueban a 375 px y en el correo de prueba. |
| B1 | A1, 0.2 | Cargar PDF al seleccionarlo. Mostrar progreso, retirada, errores y reintentos. | Una carga interrumpida se puede reintentar sin dejar un duplicado vinculado. Si se agota el espacio gratuito, el panel informa y detiene la subida. |
| B2 | B1, A2 | Añadir enlace directo, aviso de acceso público, comprobación de permisos y referencias estables. | El PDF del correo de prueba se descarga a 375 px sin sesión. El enlace anterior sigue funcionando tras reemplazar el archivo y desplegar otra versión de Preview. |
| C1 | 0.1 | Combinar grupos y usuarios. Vincular la confirmación al conjunto completo y guardar la lista exacta. | El solapamiento produce una fila por correo. Cambiar una dirección fuera de las primeras 25 exige reconfirmación aunque se conserve el total. |
| C2 | C1, 0.3 | Guardar el tipo de correo y aplicar la comprobación de consentimiento o preferencias que consume D1. | En newsletter, una baja excluye y un timeout aplaza. En aviso operativo, se respetan las preferencias vigentes. D1 verifica que las filas excluidas o aplazadas no llegan a Resend. |
| D1 | A2, B2, C2 | Conectar **Enviar ahora** a la cola con verificación de adjuntos y bajas, reserva atómica y registro de intentos. | Dos procesos y un timeout tras aceptación no duplican un correo. Un fallo parcial conserva éxitos y reintenta únicamente filas elegibles. Revocar acceso al PDF o perder la comprobación de bajas impide el despacho afectado. |
| D2 | D1, 0.3 | Añadir programación, reprogramación y cancelación con el disparador validado. | Resend acepta el envío automático dentro de la tolerancia. Reprogramar invalida la fecha anterior. Probar cancelación antes y después de autorizar un intento y comprobar qué ocurre con las filas restantes. |
| E1 | D2 | Exponer historial, contenido congelado y estados individuales en el panel administrador. | El detalle abre campañas nuevas y antiguas, y deniega el acceso sin rol. |
| E2 | D1 | Verificar el webhook en Preview protegido, asociar eventos al ID de Resend y conciliar el intento. | Un evento legítimo llega a Preview. Se distinguen aceptación, entrega y rebote. Pasan las pruebas de firma inválida, repetición y orden alterado. |
| QA | E1, E2 | Ejecutar la matriz final de Preview, primero a 375 px y después en escritorio. | Las cinco pruebas pasan y quedan registradas junto con tipos, lint y build del SHA candidato. |

**Hitos verificables.** B2 cierra el correo de prueba con PDF. D2 cierra el recorrido programado. QA cierra la entrega completa. Las tareas C pueden avanzar mientras se completa la redacción. C2 se integra en D1 y se vuelve a comprobar de extremo a extremo en D2.

**Límite de la primera entrega.** Empezar con PDF y las imágenes públicas existentes de Sanity. Los formatos extra, subir fotos nuevas desde el editor, crear grupos personalizados y recuperar masivamente eventos históricos requieren una decisión de alcance. Si un grupo imprescindible no puede representarse con los grupos actuales, aprobar su definición mínima antes de ampliar C1. Las secuencias por eventos quedan para después.

**Bloqueos.** Si Drive impide la descarga anónima o no hay capacidad gratuita, detener la parte afectada y continuar con las tareas independientes. Si el disparador no cumple la tolerancia o la baja no puede verificarse, dejar pendiente el recorrido programado y elevar esa decisión. Mantener la restricción de almacenamiento y las políticas ya aprobadas.

## Aprobación y validación

**Alcance de la primera entrega.** Se pueden combinar los grupos existentes de curso, membresía y evento con usuarios seleccionados individualmente. Los grupos personalizados se valorarán cuando haya un caso concreto que esos grupos no puedan representar.

**Tipos de correo confirmados.** Aleyda puede enviar newsletters y avisos operativos. La selección del tipo debe ser explícita. El newsletter requiere suscripción activa en la audiencia autorizada de Mailchimp al despachar y debe incluir el enlace de baja vigente. Los avisos operativos se limitan a información del servicio para el grupo afectado, como cambios de horario o acceso. Se aplican las preferencias de correo y las reglas vigentes de la web. El contenido promocional se trata como newsletter, incluso cuando también informa de un servicio.

**Tolerancia de despacho.** Objetivo de hasta cinco minutos desde la hora programada hasta la aceptación por Resend de cada destinatario elegible. La campaña solo podrá despacharse desde la hora programada. La llegada al buzón se registra por separado. En 0.3 se validará un disparador con cadencia objetivo de un minuto para dejar margen al procesamiento, y en D2 se medirá el despacho completo en Preview.

**Durante la ejecución.** Aleyda confirma el tamaño máximo de los PDF tras la prueba de 0.2 y la permanencia de los enlaces antes de cerrar B2. El SHA activo, la descarga anónima, el disparador y la recepción del webhook se acreditan en sus tareas respectivas. Usar exclusivamente los servicios y datos de prueba autorizados, incluida la audiencia aislada de Mailchimp. Registrar versión y evidencia en AUTONOMY_STATUS.md.

| Prueba de aceptación | Evidencia en Preview |
|---|---|
| Envío programado al grupo elegido | Lista exacta confirmada y un ID de Resend por destinatario elegible. Registrar aceptación dentro de la tolerancia y llegada al buzón autorizado por separado. |
| Persona seleccionada dos veces | Una sola fila lógica y un único ID de Resend aceptado para la dirección repetida. Conciliar ese ID con la recepción en el buzón de prueba. |
| Baja posterior a la programación | Baja verificada en la audiencia de prueba, fila omitida y cero intentos a Resend para esa fila. Las demás filas elegibles siguen su curso. |
| Envío cancelado | Cancelar antes de autorizar el primer intento. Una ejecución del disparador después de la hora original confirma cero llamadas a Resend para esa campaña. |
| PDF sin sesión desde móvil | Descarga y apertura del PDF a 375 px directamente en Google Drive, en sesión aislada. |

En Preview, relacionar cada destinatario lógico con sus intentos y su ID de Resend. El buzón compartido sirve para verificar la recepción. Revisar primero a 375 px y luego en escritorio. Ejecutar pruebas de tipos, lint, build y regresiones específicas antes del cierre. La aprobación de este plan habilita la implementación en Preview. Production requiere la aprobación expresa de Xavier para el commit concreto.
