# Publicación del regalo de newsletter

Xavier autoriza expresamente publicar el sistema validado en Preview, versión
`649e5c2a0a3777247b6e04b0237244ac35308a84`. La confirmación de funcionamiento
anterior y la autorización de publicar son pasos distintos; ambos constan ahora.

## Configuración real

- Mailchimp de Energía y Divinidad, usuario aleydapaola, audiencia real
  `d1b9e1cbf7`, doble confirmación activa y remitente EYD verificados por lectura.
  No se han exportado contactos ni preparado campañas.
- Audio promovido una sola vez a Content Studio de la cuenta real; 9.263.703
  bytes y hash idénticos al archivo validado. URL fuera de Git, en configuración
  privada y Secret de Vercel Production. Preview conserva su audio propio.
- Webhook real único `c54e5891c8`: subscribe, fuente user y firma HMAC activos;
  restantes eventos y fuentes admin/API desactivados. Firma únicamente como
  Secret Sensitive de Production, nunca en este documento.
- Nuevo regalo mediante Resend existente. Conserva logo/diseño, entrega tras la
  confirmación y enlace a reproductor/descarga. No contrata servicios adicionales.

## Despliegue y comprobación

Primero se publicó el SHA autorizado con regalo desactivado:
`dpl_HHndR2QGQ5D2gKC48H7NzGvoAt86`, Ready. Eso permitió registrar el callback
real sin exponer un receptor de prueba a datos de producción.

Tras guardar la firma y preparar el flag true, activación mediante reconstrucción
del mismo SHA: `dpl_GGDMGfFcFdUhQtiodDGFSZk2J7yu`, Ready. Ambos dominios reales
apuntan a ese despliegue; proyecto, equipo, repositorio y SHA cotejados.
Diagnóstico ADMIN real `ready=true`, todas las comprobaciones correctas.

Portada, sesiones, academia, eventos, membresía y regalo HTTP 200. Audio servido
como audio/mp4, HEAD de 9.263.703 bytes, avance con rango 206 y descarga attachment
completa con hash idéntico al audio aprobado. Callback sin firma y diagnóstico
anónimo HTTP 401. No se repitieron altas de prueba ni se enviaron mensajes a
contactos reales durante esta comprobación de publicación.

Sistema activo para las nuevas altas confirmadas de la newsletter de la web.
Correo con diseño/logo habituales y enlace al reproductor y descarga. No queda
activación técnica pendiente de este regalo. Las evidencias se conservan en QA
privado, sin credenciales ni datos de contactos.

## Recuperación y límites

Referencia anterior: `baseline-production-before-newsletter-2026-11-02`, SHA
`52e9c8ea`, despliegue `dpl_F4mCbkLLjPnUea5tSUvVa6mc3CQy`. El primer despliegue
del regalo, todavía desactivado, también conserva el comportamiento anterior de
altas y pagos. Cambiar variables de Vercel requiere reconstruir para aplicarlas.
No restaurar bases de datos ni borrar registros o contactos para revertir código.

No se ha aplicado una migración nueva ni cambiado pagos, políticas o contactos
existentes. No hay envío masivo del regalo a suscriptores antiguos. Las pruebas
completas de correo y uso se conservan de Preview; la revisión real se limita a
configuración y despliegue, sin afirmar un alta completa en Production si no ocurre.
