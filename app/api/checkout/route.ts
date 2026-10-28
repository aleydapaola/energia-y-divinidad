import { NextRequest, NextResponse } from "next/server";

import { oneTimeCheckout } from "@/lib/checkout/one-time-checkout";
import { applyRateLimit } from "@/lib/rate-limit";

/** Compatibility entry for one-time purchases. Never trust a browser-priced membership. */
export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, { maxRequests: 10, windowMs: 60000 });
  if (limited) {
    return limited;
  }
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.productType !== "string"
  ) {
    return NextResponse.json({ error: "Revisa los datos de la compra." }, { status: 400 });
  }
  if (body.productType.toUpperCase() === "MEMBERSHIP") {
    return NextResponse.json(
      {
        error: "Esta vía antigua de membresías está retirada. Utiliza el checkout de suscripción.",
      },
      { status: 410 }
    );
  }
  if (!["PAYPAL", "BANK_TRANSFER"].includes(body.paymentMethod)) {
    return NextResponse.json({ error: "Selecciona PayPal o Bre-B." }, { status: 400 });
  }
  return oneTimeCheckout(
    new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ...body,
        productType:
          body.metadata?.isPack && body.productType === "SESSION"
            ? "pack"
            : body.productType.toLowerCase(),
        guestEmail: body.customerEmail,
        guestName: body.customerName,
      }),
    }),
    body.paymentMethod === "PAYPAL" ? "paypal" : "breb"
  );
}
