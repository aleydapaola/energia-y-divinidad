import { getPreviewTermsPage, PREVIEW_HOLDER_IDENTIFICATION } from "./preview-terms";

export type ReviewLegalSlug = "privacidad" | "cookies" | "aviso-legal";

const drafts: Record<ReviewLegalSlug, { title: string; paragraphs: Array<[string, string]> }> = {
  privacidad: {
    title: "Política de privacidad",
    paragraphs: [
      ["h2", "Datos y finalidades identificados en la web"],
      [
        "normal",
        "Los formularios de cuenta, contacto, reserva y compra solicitan los datos necesarios para atender la petición: nombre y correo, teléfono cuando se proporciona, datos de la reserva y referencias del pedido o pago. Las contraseñas de cuenta se guardan como hashes. Los pedidos registran producto, importe, moneda y estado; los datos de acceso a PayPal se introducen en PayPal.",
      ],
      [
        "normal",
        "Estos datos permiten gestionar la cuenta, responder consultas, organizar reservas, comprobar pagos, entregar compras y enviar las comunicaciones relacionadas con ellas. Las notas que se escriban en un formulario también forman parte de la solicitud.",
      ],
      ["h2", "Servicios utilizados"],
      [
        "normal",
        "La web utiliza Vercel para el alojamiento, Neon para la base de datos, Resend para los correos y Google Calendar para organizar citas. Sanity gestiona los contenidos y archivos públicos del catálogo. PayPal interviene cuando se elige ese pago; las transferencias Bre-B se comprueban manualmente en Global66. En Preview, los pagos son ficticios y los correos se limitan al destinatario de pruebas autorizado.",
      ],
      ["h2", "Newsletter"],
      [
        "normal",
        "La suscripción se solicita por separado y utiliza confirmación por correo antes de activar el alta en Mailchimp. En Preview se utiliza una cuenta y audiencia de pruebas separadas, con el destinatario de pruebas autorizado. Una baja se conserva; para volver a suscribirse se utiliza el formulario de confirmación de Mailchimp.",
      ],
      ["h2", "Consultas y solicitudes sobre los datos"],
      [
        "normal",
        "Puedes contactar con la titular mediante el correo indicado para solicitar acceso, corrección o actualización de tus datos, consultar su uso o pedir su supresión o la revocación de una autorización cuando corresponda. Indica el correo asociado a la cuenta o petición para localizarla; la solicitud se tramita personalmente.",
      ],
      ["h2", "Pendiente antes de publicar la política definitiva"],
      [
        "normal",
        "Completar la identificación fiscal de la responsable; revisar las autorizaciones y avisos de cada formulario, los plazos de conservación y atención de solicitudes, los contratos con proveedores y las transmisiones internacionales aplicables. Este borrador no acredita que esa revisión esté completada.",
      ],
    ],
  },
  cookies: {
    title: "Política de cookies",
    paragraphs: [
      ["h2", "Cookies y almacenamiento identificados"],
      [
        "normal",
        "La cuenta utiliza cookies técnicas de autenticación y protección de los formularios de acceso. La configuración actual de la sesión tiene una duración máxima de 30 días. Las compras también crean una cookie firmada cuyo nombre comienza por eyd-order-: permite consultar el pedido desde el navegador que lo creó y caduca a los 30 días.",
      ],
      [
        "normal",
        "El carrito y la preferencia de zona horaria utilizan almacenamiento local del navegador. Algunas selecciones del proceso de membresía se guardan en el almacenamiento de la pestaña. El almacenamiento local se conserva hasta que se borra; el de sesión depende de la duración de la pestaña.",
      ],
      ["h2", "Contenido y servicios externos"],
      [
        "normal",
        "Las páginas pueden incorporar reproductores de YouTube o Vimeo. Al cargar un reproductor incrustado, el navegador se conecta con ese proveedor, que aplica sus propias condiciones y mecanismos de almacenamiento. PayPal y la protección de acceso de Vercel también pueden utilizar cookies en sus respectivos flujos.",
      ],
      ["h2", "Cómo gestionar el almacenamiento"],
      [
        "normal",
        "Puedes consultar, bloquear o eliminar cookies y almacenamiento desde los ajustes de tu navegador. Al borrarlos puedes cerrar la sesión, vaciar el carrito o perder el acceso de ese navegador a un pedido de invitado; conserva su referencia y consulta con la titular si necesitas ayuda.",
      ],
      ["h2", "Pendiente antes de publicar la política definitiva"],
      [
        "normal",
        "Completar el inventario de cookies y proveedores con una comprobación del navegador, identificar sus nombres y duraciones y revisar los controles de consentimiento para tecnologías que lo requieran. Esta página no implica que ya exista o se haya validado un gestor de consentimiento.",
      ],
    ],
  },
  "aviso-legal": {
    title: "Aviso legal",
    paragraphs: [
      ["h2", "Sitio y contacto"],
      [
        "normal",
        "Energía y Divinidad presenta información, contenidos y servicios a través de energiaydivinidad.com. Las consultas sobre el sitio y sus compras se atienden mediante los datos de contacto de la titular indicados arriba.",
      ],
      ["h2", "Compras, cambios y cancelaciones"],
      [
        "normal",
        "Las condiciones de cada compra deben consultarse en la ficha, el resumen del pedido y la página /terminos. El borrador de términos contiene la política aprobada de cambios, cancelaciones y reembolsos de sesiones individuales. Las condiciones particulares de los demás productos siguen pendientes de revisión.",
      ],
      ["h2", "Contenidos y enlaces"],
      [
        "normal",
        "Los enlaces a servicios externos llevan a páginas gestionadas por sus respectivos proveedores. Antes de publicar este aviso se deben revisar las autorizaciones de uso de los materiales del sitio y las condiciones concretas de acceso y utilización que correspondan.",
      ],
      ["h2", "Datos todavía pendientes"],
      [
        "normal",
        "La cédula aportada identifica a la titular, pero el NIT sigue pendiente de confirmación. Este aviso es un borrador de revisión y no sustituye esos datos ni la revisión final de las condiciones del sitio.",
      ],
    ],
  },
};

export function getPreviewLegalPage(slug: ReviewLegalSlug, env = process.env) {
  if (!getPreviewTermsPage(env)) {
    return null;
  }
  const draft = drafts[slug];
  const paragraphs: Array<[string, string]> = [
    ["h2", "Borrador de revisión — solo pruebas"],
    [
      "normal",
      "Este documento se prepara para revisar la web de pruebas. No está aprobado para Production. Los apartados pendientes deben completarse antes de utilizarlo como política definitiva.",
    ],
    ["h2", "Titular y contacto"],
    ["normal", PREVIEW_HOLDER_IDENTIFICATION],
    ...draft.paragraphs,
  ];
  return {
    _id: `eyd-preview-${slug}-review`,
    title: `${draft.title} — borrador de pruebas`,
    slug: { current: slug },
    pageType: slug,
    version: "preview-2026-10-28",
    lastUpdated: "2026-10-28T00:00:00Z",
    seo: {
      metaTitle: `${draft.title} de pruebas — Energía y Divinidad`,
      metaDescription: "Borrador de revisión del entorno de pruebas de Energía y Divinidad.",
    },
    content: paragraphs.map(([style, text], index) => ({
      _type: "block",
      _key: `${slug}-${index}`,
      style,
      markDefs: [],
      children: [{ _type: "span", _key: `text-${index}`, text, marks: [] }],
    })),
  };
}
