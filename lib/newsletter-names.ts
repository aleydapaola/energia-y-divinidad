// Up to 80 UTF-16 units fit within Mailchimp's 255-byte text fields.
export const NEWSLETTER_NAME_MAX_LENGTH = 80;
export const NEWSLETTER_NAME_FIELDS = [
  { name: "firstName", label: "Nombre", autoComplete: "given-name" },
  { name: "lastName", label: "Apellidos", autoComplete: "family-name" },
] as const;
export const NEWSLETTER_NAMES_ERROR =
  "Introduce tu nombre y apellidos (hasta 80 caracteres por campo).";

export function isNewsletterName(value: string) {
  return (
    value.trim().length > 0 &&
    value.trim().length <= NEWSLETTER_NAME_MAX_LENGTH &&
    !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(value)
  );
}
