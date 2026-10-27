import { NextRequest, NextResponse } from "next/server";

import { lockCheckoutInventory } from "@/lib/checkout/holds";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const order = await prisma.order.findUnique({ where: { orderNumber: reference } });
  if (!order || !(await canAccessOrder(order))) {
    return NextResponse.json({ error: "Pedido no disponible." }, { status: 404 });
  }
  const input = await request.json().catch(() => null);
  if (input?.confirmNoPayment !== true) {
    return NextResponse.json({ error: "Confirma que no has realizado el pago." }, { status: 400 });
  }
  const cancelled = await prisma.$transaction(async (tx) => {
    await lockCheckoutInventory(tx, order);
    const hold = await tx.checkoutHold.findUnique({ where: { orderId: order.id } });
    if (
      !hold ||
      hold.state !== "HELD" ||
      (await tx.manualPayment.findUnique({ where: { orderId: order.id } }))
    ) {
      return false;
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { paymentStatus: "CANCELLED" },
    });
    if (changed.count !== 1) {
      return false;
    }
    await tx.checkoutHold.update({ where: { orderId: order.id }, data: { state: "RELEASED" } });
    await tx.auditLog.create({
      data: {
        actorId: order.userId || "guest-order-owner",
        actorEmail: "",
        entityType: "order",
        entityId: order.id,
        action: "UNPAID_CHECKOUT_CANCELLED",
        before: { paymentStatus: "PENDING" },
        after: { paymentStatus: "CANCELLED" },
        reason: "El propietario libera una reserva temporal y declara que no ha realizado el pago.",
      },
    });
    return true;
  });
  return cancelled
    ? NextResponse.json({ success: true })
    : NextResponse.json(
        {
          error:
            "El pedido ya está en revisión o no admite liberar la reserva. No repitas el pago.",
        },
        { status: 409 }
      );
}
