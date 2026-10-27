import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { protectCheckoutPayment } from "@/lib/checkout/holds";
import { notifyBrebReport } from "@/lib/checkout/pending-email";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const limited = applyRateLimit(request, { maxRequests: 5, windowMs: 60000 });
  if (limited) {
    return limited;
  }
  const { reference } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber: reference },
    include: { user: true },
  });
  if (!order || !(await canAccessOrder(order))) {
    return NextResponse.json({ error: "Pedido no disponible en esta sesión." }, { status: 404 });
  }
  if (order.paymentMethod !== "BREB_MANUAL" || order.paymentStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Este pedido no admite avisos de transferencia." },
      { status: 409 }
    );
  }
  const parsed = z
    .object({ referenceNumber: z.string().trim().min(3).max(120) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Introduce la referencia de la transferencia (3–120 caracteres)." },
      { status: 400 }
    );
  }
  // Only record a customer's report. No payment status, entitlement, booking or access is changed.
  const existing = await prisma.manualPayment.findUnique({ where: { orderId: order.id } });
  if (existing) {
    return NextResponse.json({ success: true, pendingVerification: true, alreadyReported: true });
  }
  // Preserve a reported transfer's inventory until the operator reviews it.
  // A late report is still recorded even if someone else already owns the slot:
  // receiving a report is not evidence of payment or permission to overbook.
  let inventoryReview = false;
  try {
    await protectCheckoutPayment(order.id, "REPORTED", { allowExpired: true });
  } catch {
    inventoryReview = true;
  }
  try {
    await prisma.manualPayment.create({
      data: {
        orderId: order.id,
        paymentMethod: "BREB_MANUAL",
        referenceNumber: parsed.data.referenceNumber,
        approved: false,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: true, pendingVerification: true });
    }
    throw error;
  }
  let notified = true;
  try {
    await notifyBrebReport(order, order.user?.email);
  } catch {
    notified = false;
  }
  return NextResponse.json({ success: true, pendingVerification: true, notified, inventoryReview });
}
