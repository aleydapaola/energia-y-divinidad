import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { lockCheckoutInventory } from "@/lib/checkout/holds";
import { prisma } from "@/lib/prisma";

/** A rejected report is retained for audit. This never performs a refund. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (actor?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const input = z
    .object({
      verifiedNoIncomingPayment: z.literal(true),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      { error: "Comprueba que no hay ingreso e indica el motivo." },
      { status: 400 }
    );
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.paymentMethod !== "BREB_MANUAL") {
    return NextResponse.json({ error: "Pedido no disponible." }, { status: 404 });
  }
  const released = await prisma.$transaction(async (tx) => {
    await lockCheckoutInventory(tx, order);
    const hold = await tx.checkoutHold.findUnique({ where: { orderId: id } });
    if (!hold || !["HELD", "REPORTED"].includes(hold.state)) {
      return false;
    }
    const changed = await tx.order.updateMany({
      where: { id, paymentStatus: "PENDING" },
      data: { paymentStatus: "CANCELLED" },
    });
    if (changed.count !== 1) {
      return false;
    }
    await tx.checkoutHold.update({ where: { orderId: id }, data: { state: "RELEASED" } });
    await tx.manualPayment.updateMany({
      where: { orderId: id, approved: false },
      data: { rejectedReason: input.data.reason },
    });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: actor.email || "",
        entityType: "order",
        entityId: id,
        action: "CHECKOUT_RESERVATION_RELEASED",
        before: { paymentStatus: "PENDING", holdState: hold.state },
        after: { paymentStatus: "CANCELLED", holdState: "RELEASED" },
        reason: input.data.reason,
        metadata: { verifiedNoIncomingPayment: true, refundExecuted: false },
      },
    });
    return true;
  });
  return released
    ? NextResponse.json({ success: true })
    : NextResponse.json(
        {
          error:
            "El pedido ha cambiado o ya no admite liberar la reserva. Recarga antes de continuar.",
        },
        { status: 409 }
      );
}
