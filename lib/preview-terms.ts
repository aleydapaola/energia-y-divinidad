import { INDIVIDUAL_SESSION_POLICY, SESSION_RESCHEDULE_POLICY } from "./session-policy";

export const PREVIEW_TERMS_VERSION = "preview-2026-10-25";

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
      "Este borrador se utiliza exclusivamente para las compras ficticias de este entorno. Está pendiente completar la identificación fiscal, la dirección de notificación judicial y la revisión de las condiciones de los demás productos antes de publicarlo como condiciones de contratación reales.",
    ],
    ["h2", "1. Titular y contacto"],
    [
      "normal",
      "Proyecto: Energía y Divinidad, energiaydivinidad.com. Titular indicada: Aelyda Paola Vargas Galvis. Contacto: contacto@energiaydivinidad.com y +57 315 116 5921. NIT y dirección de notificación judicial: pendientes de confirmación.",
    ],
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
      "La política de cancelación anterior se refiere exclusivamente a las sesiones individuales. Las condiciones particulares de cursos, eventos, talleres, productos digitales y membresías requieren su propia revisión; no se les aplica automáticamente el límite de 24 horas ni se establece aquí una exclusión general de devoluciones.",
    ],
    ["h2", "6. Derechos del consumidor y consultas"],
    [
      "normal",
      "La política comercial de sesiones no limita los derechos obligatorios que correspondan al consumidor, incluido el retracto o la reversión del pago cuando resulten aplicables. Las consultas sobre una compra, entrega, cambio o devolución se atienden mediante los datos de contacto anteriores.",
    ],
  ];

  return {
    _id: "eyd-preview-terms-review",
    title: "Términos y condiciones — borrador de pruebas",
    slug: { current: "terminos" },
    pageType: "terms",
    version: PREVIEW_TERMS_VERSION,
    lastUpdated: "2026-10-25T12:00:00Z",
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
