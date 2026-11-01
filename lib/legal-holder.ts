export const LEGAL_HOLDER_PLACEHOLDER = "{{EYD_HOLDER_IDENTIFICATION}}";
export const HOLDER_IDENTIFICATION =
  "Proyecto: Energía y Divinidad, energiaydivinidad.com. Titular: Aleyda Paola Vargas Galvis. Cédula de ciudadanía: 53.102.423. Contacto: contacto@energiaydivinidad.com y +57 315 116 5921. Dirección de notificación: Cra 72a # 10 a 22, Bogotá, Colombia.";

export function getHolderIdentification(env: Record<string, string | undefined> = process.env) {
  const production = env.VERCEL_ENV === "production";
  const nit = (production ? env.LEGAL_HOLDER_NIT : env.PREVIEW_LEGAL_HOLDER_NIT)?.trim() || "";
  const valid = /^\d+-\d$/.test(nit);
  if (production && !valid) {
    throw new Error("Falta configurar la identificación fiscal para los documentos legales");
  }
  return `${HOLDER_IDENTIFICATION} NIT: ${valid ? nit : "pendiente de publicación"}.`;
}

type LegalDocument = { content?: Array<{ children?: Array<{ text?: string }> }> };

/** Resolve only this literal marker on the server; the CMS never needs the real NIT. */
export function resolveLegalHolder<T extends LegalDocument | null>(
  page: T,
  env: Record<string, string | undefined> = process.env
): T {
  if (
    !page?.content?.some((block) =>
      block.children?.some((span) => span.text === LEGAL_HOLDER_PLACEHOLDER)
    )
  ) {
    return page;
  }
  const identity = getHolderIdentification(env);
  return {
    ...page,
    content: page.content.map((block) => ({
      ...block,
      children: block.children?.map((span) =>
        span.text === LEGAL_HOLDER_PLACEHOLDER ? { ...span, text: identity } : span
      ),
    })),
  } as T;
}
