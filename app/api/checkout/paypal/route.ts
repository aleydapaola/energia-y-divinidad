import { NextRequest, NextResponse } from "next/server";

import { oneTimeCheckout } from "@/lib/checkout/one-time-checkout";

/** One-time purchases always use the authoritative catalog quote.
 * Memberships use /api/checkout/paypal-subscription, not this retired one-time flow. */
export async function POST(request: NextRequest) {
  const candidate = await request
    .clone()
    .json()
    .catch(() => null);
  if (
    typeof candidate?.productType === "string" &&
    candidate.productType.toLowerCase() === "membership"
  ) {
    return NextResponse.json(
      {
        error: "Esta vía antigua de membresías está retirada. Utiliza el checkout de suscripción.",
      },
      { status: 410 }
    );
  }
  return oneTimeCheckout(request, "paypal");
}
