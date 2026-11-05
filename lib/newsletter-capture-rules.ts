export const NEWSLETTER_CONSENT_VERSION = "meditation-capture-v1";
export const NEWSLETTER_CONSENT_TEXT =
  "Quiero recibir la meditación del Ángel de la Guarda y suscribirme a las novedades, cursos, eventos y ofertas de Energía y Divinidad. Puedo darme de baja en cada correo.";
export const CAPTURE_SOURCES = [
  "home",
  "footer",
  "landing",
  "invitation",
  "blog",
  "instagram",
  "whatsapp",
] as const;
export const CAPTURE_VARIANTS = ["control", "invitation", "none"] as const;
export const CAPTURE_DEVICES = ["mobile", "desktop"] as const;
export type CaptureSource = (typeof CAPTURE_SOURCES)[number];
export type CaptureVariant = (typeof CAPTURE_VARIANTS)[number];
export type CaptureDevice = (typeof CAPTURE_DEVICES)[number];
export const CAPTURE_EXPERIMENT = "meditation-invitation-v1";
export const INVITATION_DELAY_MS = 15_000;
export const INVITATION_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export function invitationPage(path: string) {
  return (
    ["/", "/blog", "/sobre-mi", "/testimonios", "/meditaciones"].includes(path) ||
    /^\/blog\/[^/]+$/.test(path)
  );
}

export function invitationEligible(input: {
  path: string;
  variant: CaptureVariant;
  elapsed: number;
  progress: number;
  dismissedUntil: number;
  requestedUntil: number;
  now: number;
  authenticated: boolean;
  busy: boolean;
}) {
  return (
    invitationPage(input.path) &&
    input.variant === "invitation" &&
    input.elapsed >= INVITATION_DELAY_MS &&
    input.progress >= 0.35 &&
    input.dismissedUntil <= input.now &&
    input.requestedUntil <= input.now &&
    !input.authenticated &&
    !input.busy
  );
}
