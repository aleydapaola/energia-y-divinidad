import { NextResponse } from "next/server";
import { z } from "zod";

import { incrementNewsletterMetric } from "@/lib/newsletter-capture";
import { CAPTURE_SOURCES, CAPTURE_VARIANTS, CAPTURE_DEVICES } from "@/lib/newsletter-capture-rules";
import { consumeFormLimit, publicFormIP, publicFormError } from "@/lib/public-form-security";

const schema = z
  .object({
    source: z.enum(CAPTURE_SOURCES),
    variant: z.enum(CAPTURE_VARIANTS),
    device: z.enum(CAPTURE_DEVICES),
    event: z.enum(["visit", "form", "invitation"]),
  })
  .strict();

export async function POST(request: Request) {
  try {
    if (
      request.headers.get("origin") !== new URL(request.url).origin ||
      Number(request.headers.get("content-length") || 0) > 1024
    ) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await consumeFormLimit("newsletter-metrics", publicFormIP(request), 60, 900_000);
    await incrementNewsletterMetric(parsed.data, parsed.data.event);
    return new Response(null, { status: 204 });
  } catch (error) {
    return publicFormError(error);
  }
}
