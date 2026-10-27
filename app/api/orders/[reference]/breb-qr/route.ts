import { NextRequest, NextResponse } from "next/server";

import { getBrebConfiguration, getBrebQrImage, getBrebQrSource } from "@/lib/breb";
import { checkoutHoldStatus, requiresCheckoutHold } from "@/lib/checkout/hold-store";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders/[reference]/breb-qr
 * Serves the static account QR for a Bre-B order. It is kept out of the status
 * JSON so the polling client never downloads the image on every refresh.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  if (!reference) {
    return new NextResponse(null, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { orderNumber: reference },
    select: {
      userId: true,
      orderNumber: true,
      paymentMethod: true,
      orderType: true,
      metadata: true,
      checkoutHold: { select: { state: true, expiresAt: true } },
    },
  });
  if (!order || order.paymentMethod !== "BREB_MANUAL" || !(await canAccessOrder(order))) {
    return new NextResponse(null, { status: 404 });
  }
  const reservation = checkoutHoldStatus(order.checkoutHold);
  if ((reservation && !reservation.canPay) || (!reservation && requiresCheckoutHold(order))) {
    return new NextResponse(null, {
      status: 409,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const configuration = getBrebConfiguration();
  const source = configuration.enabled ? getBrebQrSource() : null;
  if (!source) {
    return new NextResponse(null, { status: 404 });
  }
  const inline = getBrebQrImage(source);
  if (!inline) {
    return NextResponse.redirect(source, 302);
  }
  return new NextResponse(new Uint8Array(Buffer.from(inline.base64, "base64")), {
    headers: {
      "Content-Type": inline.contentType,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
