export const NEWSLETTER_GIFT_PAGE_PATH = "/regalo/meditacion-angel-de-la-guarda";
export const NEWSLETTER_GIFT_AUDIO_PATH = "/api/newsletter/meditacion";

export function newsletterGiftPageUrl(appUrl: string) {
  return new URL(NEWSLETTER_GIFT_PAGE_PATH, appUrl).toString();
}
