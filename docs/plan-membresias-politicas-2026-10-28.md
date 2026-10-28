# Membresías y condiciones comerciales — solo Preview

Autorización nueva de Xavier: elegir criterios habituales de sitios comparables para talleres/cursos/digitales e incluir las membresías recurrentes en el primer lanzamiento, preparando sus pruebas antes de publicar. No autoriza Production.

## Criterios elegidos

- Cursos grabados y productos digitales: garantía comercial de devolución íntegra durante 14 días naturales. Se cancela el acceso/licencia tras el reembolso. No se presenta el hecho de descargar como renuncia automática a derechos legales.
- Talleres y eventos en directo: devolución íntegra hasta 7 días antes; menos antelación/no asistencia, excepciones personales, sin devolución automática. Cancelación o cambio de fecha por Aleyda: devolución íntegra o nueva fecha a elección del cliente.
- Membresías: mantener la oferta existente de prueba inicial de 30 días (los dos tiers del CMS indican esa duración), una vez por cliente; cobros posteriores conforme al precio/moneda/período aceptados. Cancelación sin nuevas renovaciones y acceso hasta el fin del período vigente. Derechos legales y errores de cobro prevalecen sobre las limitaciones comerciales.
- Tramitación manual y sin imponer créditos o descontar comisiones. Respetar el medio de devolución que corresponda legalmente. Las reglas confirmadas de sesiones individuales no cambian.

Referencias: [Domestika: 14 días para cursos](https://www.domestika.org/es/terms), [Udemy: 30 días para cursos aptos](https://support.udemy.com/hc/es/requests/new?type=student), [Eventbrite: opción/default 7 días](https://www.eventbrite.com/help/en-us/articles/130304/how-to-set-a-refund-policy/), [Ley 1480, art. 47](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm), [Ley 2439/2024](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116). Las referencias varían; no se afirma que exista una política única estadísticamente mayoritaria.

## Orden de trabajo

1. Textos compartidos, información antes de comprar y registro de la versión aceptada.
2. Membresía PayPal: cotización desde CMS, plan sandbox separado y verificado (importe/moneda/intervalo), cuenta obligatoria y consentimiento de cobro recurrente; prueba inicial sin duplicarla mediante el plan del proveedor.
3. Activación: sesión propietaria, enlace inequívoco pedido/suscripción/plan/custom_id y estado realmente aprobado. APPROVAL_PENDING no concede acceso. Mantener entrega existente Subscription/Entitlement y hacerla atómica e idempotente.
4. Renovaciones: firma API PayPal, registro único de evento y de venta, validación del importe y moneda; evitar ampliar el período dos veces y no calcular cobros locales de PayPal.
5. Cancelación: no prometer cancelación si falla PayPal; webhook no revoca antes del fin del período pagado/prueba. Expiración/suspensión y reintentos coherentes.
6. Pruebas locales y con fixtures efímeras de Neon Preview; después configuración sandbox, despliegue y aprobación personal de Xavier en PayPal. No aceptar acuerdos ni confirmar cobros reales desde herramientas.
7. Cerrar revisión visual del cliente y del Studio recuperada, correo de bienvenida y datos legales pendientes. No publicar Production sin aprobar la versión concreta.

## Hallazgos iniciales

El código anterior aceptaba APPROVAL_PENDING en la activación, admitía sustituir la suscripción mediante query sin vincular custom_id, repetía renovaciones por cada webhook sin deduplicación y revocaba acceso inmediatamente al recibir CANCELLED. El servicio de cancelación podía anunciar éxito aunque fallase el proveedor. No se habilitan nuevos eventos ni planes hasta corregir y probar el circuito.

Catálogo Preview leído sin editar: Esencia 22 USD mensual/239 anual; Divinidad 33 USD mensual/357 anual. Ambos activos, trialPeriod 30 días; no hay precios EUR explícitos. No inventar precios EUR mediante una conversión al crear planes. Los planes/configuración sandbox deben ser propios de Preview y no heredar IDs live.

## Implementación y comprobaciones del candidato

- Cotización de catálogo activo sin CDN, identidad y precio del servidor; consentimiento independiente de condiciones y renovación registrado en el pedido. La prueba utiliza los 30 días configurados, una vez por cuenta; no se reinicia el historial.
- Fuera de Production, los IDs requieren prefijo PREVIEW_PAYPAL_PLAN_ID_. El proveedor debe confirmar un plan regular con precio/moneda/intervalo exactos, sin una segunda prueba ni cargos de alta.
- Retorno autenticado del propietario y vínculo inmutable order/custom_id/plan/subscription. APPROVAL_PENDING no concede acceso; un alta sin prueba espera una venta verificada.
- Entrega compartida Subscription/Entitlement atómica. Avisos y ventas se deduplican por separado. Una venta anterior no sustituye el período más reciente; un estado viejo no reactiva una autorización ya cancelada. PayPal gestiona sus cobros y reintentos: la web no cobra de nuevo por recibir un aviso.
- Cancelación falla si no se confirma con PayPal, conserva la fecha más reciente bajo bloqueo y mantiene el acceso vigente. Publicaciones y biblioteca respetan nivel/beneficio del plan.
- Correos de prueba, cobro y cancelación en EmailLog, con clave estable de idempotencia para los reintentos y destinatario de Preview forzado por deliverEmail. La activación gratuita no se presenta como un pago. Un error de entrega queda registrado; revisar/reintentar los pendientes en QA.
- Herramienta ADMIN exclusiva /admin/subscriptions/preview-setup para preparar/reutilizar los cuatro planes sandbox Esencia/Divinidad USD. No crea acuerdos ni cobros. Bloqueada en Production, para USER y para peticiones de otro origen. Los IDs obtenidos se configuran solo en Preview; todavía no se han preparado mediante esta herramienta.

Resultado local: **171 pruebas**, tipos y lint sin errores (avisos conservados), compilación completa **137 páginas**. Prueba con fixtures efímeras en Neon Preview: dos activaciones simultáneas, una membresía/acceso; autorización sin pago pendiente; venta única aunque cambie el ID del webhook; cancelación conserva acceso; rollback atómico. Fixtures retiradas, sin cargar clientes PayPal ni enviar mensajes. No equivale a una autorización/cobro real sandbox desde el despliegue.

## Pendiente de ejecución remota

1. Verificar Ready, fuente y ambos alias del candidato, manteniendo Production intacta.
2. ADMIN Preview: preparar los cuatro planes sandbox y guardar sus IDs como Config de la rama preview. Revisar el webhook existente y añadir solo los eventos de membresía tratados, conservando los de captura puntual.
3. CLIENT Preview: resumen mensual con prueba y aprobación personal de Xavier en PayPal; comprobar una membresía/acceso, fecha/precio del primer cobro y correos. Cancelar la renovación ficticia y comprobar que conserva el acceso.
4. Alta sin repetir prueba y facturación anual: preparar y aprobar personalmente el cobro ficticio correspondiente. No modificar el historial para forzar elegibilidad. Las renovaciones a futuro no se consideran probadas por simular avisos.
5. Antes de Production, inventariar suscripciones anteriores y preparar su compatibilidad/migración; el conciliador nuevo exige pedidos versión 2. No desplegarlo sobre acuerdos históricos sin revisarlos. Mantener revisión manual de devoluciones/reversiones y comprobar su procedimiento de retirada de acceso.
6. NIT cotejado con RUT, textos finales de privacidad/cookies, enlace real y entrega automática de meditación siguen pendientes. El enlace # es un marcador autorizado; no un regalo entregado.

Fuentes técnicas: [Subscriptions API](https://developer.paypal.com/api/subscriptions/v1), [eventos de webhook](https://developer.paypal.com/api/rest/webhooks/event-names/), [idempotencia](https://developer.paypal.com/api/rest/reference/idempotency/), [catálogo de productos](https://developer.paypal.com/api/catalog-products/v1).

## Resultado remoto de la primera etapa

- e710c6fd991834b1b1b0b3d95e907dccdf037d14 Ready, dpl_CP8wpwAmdN4DewpHZ8bg485eAaBy. Proyecto/equipo/repositorio/ref verificados. Alias técnico y preview.energiaydivinidad.com asignados; el subdominio se actualiza expresamente tras Ready. Términos HTTP 200 con 14 días/7 días/membresías/dirección/NIT pendiente; resumen anónimo de membresía HTTP 401.
- ADMIN Preview recuperado mediante autocompletado nativo del acceso guardado, rol comprobado por el panel y API. Preparados los cuatro planes sandbox Esencia/Divinidad con los importes del CMS, sin acuerdos ni cargos. Auditoría de Preview leída y cotejada; catálogo privado en .local-private/preview-qa-2026-10-27/membership-plan-catalogue.json. No crear otros planes duplicados.
- Cuatro variables PREVIEW_PAYPAL_PLAN_ID_{ESENCIA|DIVINIDAD}_USD_{MONTHLY|YEARLY} añadidas como Encrypted únicamente Preview, gitBranch preview, y verificadas por metadatos. Las verá el siguiente despliegue; no equivale a una suscripción aprobada.
- Nueva comprobación preparada: origen de aprobación PayPal estrictamente sandbox fuera de Production, también al reutilizar un intento pendiente; datos de nombre sin apellido vacío. La herramienta ADMIN añade por API solo los diez eventos esperados al webhook existente (dos capturas y ocho de membresía), preservando y verificando su URL privada. Rechaza Production, otros receptores y wildcard; no crea credenciales ni un webhook duplicado.
- **176 pruebas** y tipos/lint sin errores para esta continuación. La activación de eventos, el nuevo despliegue con variables y el recorrido personal de aprobación sandbox aún requieren comprobarse remotamente. No se han enviado correos de membresía ni autorizado cargos recurrentes.

La revisión automática rechazó Copy password; no copiar, extraer ni leer contraseñas. El autocompletado nativo está permitido y se utilizó para ADMIN. Developer quedó disponible y se verificó Aleyda Vargas Galvis / Energia y Divinidad Sandbox. No usar el comprador sandbox para iniciar sesión en paypal.com; se utiliza únicamente en www.sandbox.paypal.com. La aprobación final de acuerdos/cobros sandbox sigue a cargo de Xavier.
