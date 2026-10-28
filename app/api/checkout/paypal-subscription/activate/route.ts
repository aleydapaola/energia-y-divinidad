import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { membershipIntent } from "@/lib/membership-intent";
import { reconcilePayPalMembership } from "@/lib/paypal-memberships";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const session = await auth();
  if (!session?.user?.id) {
    const callback = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(
      `${appUrl}/auth/signin?callbackUrl=${encodeURIComponent(callback)}`
    );
  }
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      throw new Error("Missing order");
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== session.user.id || order.orderType !== "MEMBERSHIP") {
      throw new Error("Order not available");
    }
    const intent = membershipIntent(order.metadata);
    const suppliedId = request.nextUrl.searchParams.get("subscription_id");
    if (
      !intent.paypalSubscriptionId ||
      (suppliedId && suppliedId !== intent.paypalSubscriptionId)
    ) {
      throw new Error("Subscription mismatch");
    }
    await reconcilePayPalMembership({
      subscriptionId: intent.paypalSubscriptionId,
      requestingUserId: session.user.id,
      expectedOrderId: order.id,
    });
    // Non-trial approval alone remains pending until a real sale is verified.
    return NextResponse.redirect(
      `${appUrl}/pago/confirmacion?ref=${encodeURIComponent(order.orderNumber)}`
    );
  } catch {
    return NextResponse.redirect(`${appUrl}/pago/error?reason=membership_verification_pending`);
  }
}
