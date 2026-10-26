import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getBrebConfiguration, getBrebQrImage, getBrebQrSource } from "@/lib/breb";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/payments/breb/health
 * Explains why Bre-B is enabled or disabled, instead of an opaque 503 at checkout.
 * The key is masked and the QR bytes are never returned.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (actor?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const configuration = getBrebConfiguration();
  const source = getBrebQrSource();
  const inline = source ? getBrebQrImage(source) : null;
  let qrSourceType: string | null = null;
  if (source) {
    qrSourceType = inline ? "inline-data-url" : "https-url";
  }
  const qrBytes = inline ? Buffer.from(inline.base64, "base64").length : null;

  return NextResponse.json({
    environment: configuration.simulation ? "simulation" : "production",
    enabled: configuration.enabled,
    simulation: configuration.simulation,
    keyType: configuration.keyType,
    keyMasked: configuration.keyMasked,
    recipient: configuration.recipient,
    amountMode: configuration.amountMode,
    qr: {
      configured: configuration.qrConfigured,
      sourceType: qrSourceType,
      contentType: inline?.contentType ?? null,
      bytes: qrBytes,
    },
    checks: {
      verifiedFlag: process.env.GLOBAL66_BREB_VERIFIED === "true",
      keyPresent: !!(process.env.GLOBAL66_BREB_KEY || "").trim(),
      keyTypeDeclared: !!(process.env.GLOBAL66_BREB_KEY_TYPE || "").trim(),
      recipientPresent: !!(process.env.GLOBAL66_BREB_RECIPIENT || "").trim(),
      qrPresent: !!source,
    },
  });
}
