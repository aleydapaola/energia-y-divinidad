# QA de captación newsletter — 11/11/2026

Candidato de aplicación: 0664ffeb745983a2a098adfee5bd6504fbf19a44, rama preview. Base verificada a6d272ac1bb6a34ca3f177cbf964846983f44d55. Main permanece cb4eaf6215f433ac0473a78c4cb06bbe961825ba; sin autorización ni publicación de newsletter a Production.

## Implementación integrada

Restaurada la captación 75edba4c sobre el carril estable mediante revert normal de la retirada 58afe35e. Conservados el hotfix de correo y los cambios originales. Integrados CTA móvil a #recibir, encuadre de foto, WhatsApp en flujo móvil y ocultación de invitación ante diálogo posterior. Sin dependencias nuevas o cambios nuevos de consentimiento, pagos o políticas; se recuperan las explicaciones de captación ya existentes.

## Verificación local

- 269/269 pruebas simuladas correctas en la suite completa de integración; log /private/tmp/eyd-newsletter-integration-tests.log. Incluye 80 pruebas específicas de newsletter/normalización.
- TypeScript sin emisión correcto. ESLint del código integrado y pruebas nuevas: cero errores, tres avisos previos en Header/gift. Lint ampliado a pruebas históricas detecta curly preexistente en newsletter-audio.test.mjs y avisos de mocks, sin cambio de ese archivo.
- Prettier de retocos/componentes/pruebas/fixture correcto; git diff --check correcto.
- local:check invocado: npm termina 255; mismo guarda directo bloquea por DATABASE_URL ausente. No se arranca Next, ni build o migraciones locales.

## Interacción aislada simulada

Artefacto /private/tmp/eyd-newsletter-browser-fixture.html: bundle con esbuild ya instalado de los componentes reales NewsletterForm y NewsletterInvitation del candidato, React/DOM reales y CSS Tailwind actual. Adaptadores de Link, ruta, sesión y carrito, respuesta pending simulada. fetch solo responde a newsletter/metrics simulados; CSP connect-src none, default-src none y form-action none. No servidor ni conexión a proveedores. La variante forzada es exclusiva del archivo local, sin modificar preferencias de visitantes Preview. Las fuentes de marca no se cargan en esta fixture.

Primero 375×667, después 375×500: casilla inicialmente desmarcada, normalización del correo sintético en blur, foco correo→casilla→privacidad→botón, solicitud única simulada y mensaje de confirmación completo, sin recorte horizontal observado. Tras re-render por apertura/cierre de diálogo de fixture el mensaje permanece, sin otra solicitud. Invitación visible ocultada al enfocar el formulario. No prueba entrega, lector de pantalla, teclado físico móvil ni persistencia tras recarga.

## Preview final

Despliegue dpl_b8NEwnBBhbHs2EkeTC1aQTApP65n observado Building, repo/equipo/proyecto/rama/SHA correctos. Pendiente Ready y revisión visual final.
