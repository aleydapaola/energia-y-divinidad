import { NextRequest, NextResponse } from "next/server";

import { parseNewsletterEvent, processNewsletterGift } from "@/lib/newsletter-gift";
import {
  newsletterGiftConfiguration,
  parseNewsletterSignature,
  verifyNewsletterSignature,
} from "@/lib/newsletter-gift-config";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY_BYTES = 65536;

/** Fixed response for Mailchimp's callback validation; no personal data or configuration. */
export async function GET() {
  return new NextResponse("EYD newsletter callback", { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const config = newsletterGiftConfiguration();
  if (!config.ready || !config.signingSecret) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  }
  const signature = request.headers.get("x-mailchimp-signature");
  if (!parseNewsletterSignature(signature)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  ) {
    return NextResponse.json({ error: "Formato no admitido" }, { status: 415 });
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 });
      }
      chunks.push(next.value);
    }
  } catch {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  const raw = Buffer.concat(chunks);
  if (!verifyNewsletterSignature(raw, signature, config.signingSecret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let event;
  try {
    event = parseNewsletterEvent(raw.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  if (!event) {
    return NextResponse.json({ received: true });
  }
  try {
    await processNewsletterGift(event);
    return NextResponse.json({ received: true });
  } catch {
    // Let Mailchimp retry. Neither raw payloads, recipients nor secrets are logged.
    return NextResponse.json({ error: "Entrega pendiente de reintento" }, { status: 503 });
  }
}
