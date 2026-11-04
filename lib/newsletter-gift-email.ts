import { newsletterGiftPageUrl } from "./newsletter-gift-links";

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export const NEWSLETTER_GIFT_SUBJECT = "Tu meditación del Ángel de la Guarda";
export const EYD_EMAIL_LOGO = "https://www.energiaydivinidad.com/images/logoNoBackground.png";

/** Same logo, typography, card and spacing as sendWelcomeEmail; existing emails stay intact. */
export function renderNewsletterGiftEmail(input: {
  unsubscribeUrl: string;
  postalAddress: string;
  appUrl: string;
  preview: boolean;
  year: number;
}) {
  // Never render a newsletter gift without the real hosted unsubscribe form.
  const unsubscribe = new URL(input.unsubscribeUrl);
  if (
    unsubscribe.protocol !== "https:" ||
    !unsubscribe.hostname.endsWith(".list-manage.com") ||
    unsubscribe.pathname !== "/unsubscribe" ||
    unsubscribe.username ||
    unsubscribe.password ||
    unsubscribe.port ||
    unsubscribe.hash ||
    !unsubscribe.searchParams.get("u") ||
    !unsubscribe.searchParams.get("id")
  ) {
    throw Error("Newsletter unsubscribe link unavailable");
  }
  const giftUrl = newsletterGiftPageUrl(input.appUrl);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${NEWSLETTER_GIFT_SUBJECT}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f0f5">
<table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f8f0f5"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse">
<tr><td align="center" style="padding:30px 0"><a href="${escape(input.appUrl)}" style="text-decoration:none"><img src="${EYD_EMAIL_LOGO}" alt="Energía y Divinidad" width="200" style="display:block;max-width:200px;width:100%;height:auto;border:0"></a></td></tr>
<tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 4px 6px rgba(138,75,175,0.1)">
<h2 style="margin:0 0 20px;font-size:24px;color:#654177;font-weight:600">${NEWSLETTER_GIFT_SUBJECT}</h2>
<p style="margin:0 0 20px;font-size:16px;color:#666666;line-height:1.6">Gracias por confirmar tu suscripción. Te doy la bienvenida a este espacio para conectar contigo y acompañar tu camino espiritual.</p>
<p style="margin:0 0 20px;font-size:16px;color:#666666;line-height:1.6">Como regalo de bienvenida, aquí tienes la <strong>Meditación del Ángel de la Guarda</strong>. Puedes descargarla y escucharla cuando quieras.</p>
<table role="presentation" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:30px 0"><a href="${escape(giftUrl)}" style="display:inline-block;padding:16px 40px;background-color:#8A4BAF;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">Escuchar y descargar mi meditación</a></td></tr></table>
<p style="margin:0 0 24px;font-size:13px;color:#999999;line-height:1.6;text-align:center">Audio M4A · 18 min 43 s · 9,3 MB</p>
<p style="margin:0;font-size:14px;color:#999999;line-height:1.6;text-align:center">Con amor y luz,<br><strong style="color:#8A4BAF">Aleyda Paola</strong></p></td></tr>
<tr><td align="center" style="padding:30px 0"><p style="margin:0 0 12px;font-size:12px;color:#999999">© ${input.year} Energía y Divinidad. Todos los derechos reservados.</p>
${input.preview ? '<p style="margin:0 0 12px;font-size:12px;color:#999999">[PREVIEW] Mensaje exclusivo de pruebas de Energía y Divinidad.</p>' : ""}
<p style="margin:0 0 12px;font-size:12px;color:#999999">Recibes este regalo porque has confirmado tu suscripción a la newsletter.</p>
<p style="margin:0 0 12px;font-size:12px;color:#999999"><a href="${escape(input.unsubscribeUrl)}" style="color:#654177">Darme de baja</a> · <a href="mailto:contacto@energiaydivinidad.com" style="color:#654177">Contactar con Aleyda</a></p>
<p style="margin:0;font-size:12px;color:#999999">${escape(input.postalAddress)}</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${NEWSLETTER_GIFT_SUBJECT}\n\nGracias por confirmar tu suscripción a Energía y Divinidad.\n\nEscuchar y descargar tu regalo de bienvenida: ${giftUrl}\nAudio M4A · 18 min 43 s · 9,3 MB\n\nCon amor y luz,\nAleyda Paola\n\n${input.preview ? "[PREVIEW] Mensaje exclusivo de pruebas.\n" : ""}Darme de baja: ${input.unsubscribeUrl}\nContacto: contacto@energiaydivinidad.com\n${input.postalAddress}`;
  return { html, text };
}
