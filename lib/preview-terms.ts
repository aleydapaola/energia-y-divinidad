import {
  COMMERCIAL_POLICY_VERSION,
  COURSE_REFUND_POLICY,
  DIGITAL_REFUND_POLICY,
  EVENT_REFUND_POLICY,
  MEMBERSHIP_CANCELLATION_POLICY,
  REFUND_REQUEST_POLICY,
  CONSUMER_RIGHTS_POLICY,
} from "./commercial-policy";
import { INDIVIDUAL_SESSION_POLICY, SESSION_RESCHEDULE_POLICY } from "./session-policy";

export const PREVIEW_TERMS_VERSION = COMMERCIAL_POLICY_VERSION;
export const PREVIEW_HOLDER_IDENTIFICATION =
  "Proyecto: Energía y Divinidad, energiaydivinidad.com. Titular: Aleyda Paola Vargas Galvis. Cédula de ciudadanía: 53.102.423. Contacto: contacto@energiaydivinidad.com y +57 315 116 5921. Dirección de notificación: Cra 72a # 10 a 22, Bogotá, Colombia. NIT: pendiente de confirmación.";

/** A review draft for the isolated test environment; never a Production fallback. */
export function getPreviewTermsPage(env: Record<string, string | undefined> = process.env) {
  if (
    env.VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_SANITY_DATASET !== "preview" ||
    env.PREVIEW_SANITY_DATASET !== "preview"
  ) {
    return null;
  }

  const paragraphs: Array<[string, string]> = [
    ["h2", "Documento de revisión para pruebas"],
    [
      "normal",
      "Este borrador se utiliza exclusivamente para las compras ficticias de este entorno. Antes de utilizarlo en compras reales, falta confirmar la identificación fiscal y aprobar la versión definitiva para publicación.",
    ],
    ["h2", "1. Titular y contacto"],
    ["normal", PREVIEW_HOLDER_IDENTIFICATION],
    ["h2", "2. Información de la compra y confirmación"],
    [
      "normal",
      "La ficha y el resumen de compra muestran el producto o servicio, su importe, moneda y modalidad. La entrega o reserva se confirma cuando se verifica el pago. Comunicar una referencia de transferencia no equivale a confirmar el ingreso. En este entorno, PayPal utiliza sandbox y Bre-B es una simulación interna: no realices pagos ni transferencias reales.",
    ],
    ["h2", "3. Sesiones individuales: cancelaciones y cambios"],
    ...INDIVIDUAL_SESSION_POLICY.map(({ label, text }): [string, string] => [
      "normal",
      `${label}: ${text}`,
    ]),
    ["normal", SESSION_RESCHEDULE_POLICY],
    [
      "normal",
      "Elegir la primera fecha de una sesión confirmada todavía sin programar no consume ninguno de los dos cambios. Las fechas y horas de la reserva se identifican en hora de Colombia; la cuenta también muestra la conversión al huso del dispositivo cuando es diferente.",
    ],
    ["h2", "4. Tramitación del reembolso de una sesión individual"],
    [
      "normal",
      "Para solicitar la devolución, contacta con Aleyda e indica la reserva o referencia del pedido. Aleyda comprueba la operación y tramita manualmente el reembolso íntegro por el medio de pago original. Con 24 horas o más, esta comprobación no condiciona el derecho a la devolución. No se descuentan comisiones al cliente ni se sustituye su elección por créditos. Cancelar la reserva no ejecuta automáticamente la devolución del dinero.",
    ],
    ["h2", "5. Cursos, eventos y productos digitales"],
    [
      "normal",
      "La política de 24 horas anterior se refiere exclusivamente a las sesiones individuales. Para las demás compras se aplican las condiciones siguientes.",
    ],
    ["normal", COURSE_REFUND_POLICY],
    ["normal", DIGITAL_REFUND_POLICY],
    ["normal", EVENT_REFUND_POLICY],
    ["h2", "6. Membresías y renovaciones"],
    [
      "normal",
      "La contratación indica el importe, la moneda y la periodicidad mensual o anual, la duración de la prueba si corresponde y el primer cobro previsto. Requiere autorizar expresamente la renovación recurrente en PayPal. La prueba gratuita solo se ofrece una vez por cuenta de cliente; un nuevo alta después de haberla utilizado comienza con el precio indicado, sin una segunda prueba gratuita.",
    ],
    ["normal", MEMBERSHIP_CANCELLATION_POLICY],
    ["h2", "7. Solicitudes y derechos del consumidor"],
    ["normal", REFUND_REQUEST_POLICY],
    ["normal", CONSUMER_RIGHTS_POLICY],
  ];

  return {
    _id: "eyd-preview-terms-review",
    title: "Términos y condiciones — borrador de pruebas",
    slug: { current: "terminos" },
    pageType: "terms",
    version: PREVIEW_TERMS_VERSION,
    lastUpdated: "2026-10-28T00:00:00Z",
    seo: {
      metaTitle: "Términos de pruebas — Energía y Divinidad",
      metaDescription:
        "Borrador para revisar las condiciones y la política de sesiones individuales en el entorno de pruebas.",
    },
    content: paragraphs.map(([style, text], index) => ({
      _type: "block",
      _key: `preview-terms-${index}`,
      style,
      markDefs: [],
      children: [{ _type: "span", _key: `text-${index}`, text, marks: [] }],
    })),
  };
}
