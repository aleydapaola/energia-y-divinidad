import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { processApprovedPayment } from "@/lib/payment-processor";
import { prisma } from "@/lib/prisma";

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
  const body = z
    .object({
      transactionReference: z.string().trim().min(3).max(120),
      verifiedInAccount: z.literal(true),
      notes: z.string().max(2000).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Comprueba el ingreso en la cuenta e indica su referencia." },
      { status: 400 }
    );
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { user: true } });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (
    ![
      "BREB_MANUAL",
      "MANUAL_NEQUI",
      "MANUAL_TRANSFER",
      "MANUAL_BANCOLOMBIA",
      "MANUAL_DAVIPLATA",
    ].includes(order.paymentMethod)
  ) {
    return NextResponse.json(
      { error: "El proveedor debe confirmar este método de pago." },
      { status: 400 }
    );
  }
  // Serialize settlement by transaction reference. A transfer cannot settle two orders.
  const claimed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`manual-payment:${body.data.transactionReference}`}))`;
    const used = await tx.order.findFirst({
      where: {
        id: { not: id },
        paymentMethod: order.paymentMethod,
        paymentStatus: { in: ["PROCESSING", "COMPLETED"] },
        metadata: { path: ["transactionReference"], equals: body.data.transactionReference },
      },
    });
    if (used) {
      return false;
    }
    const result = await tx.order.updateMany({
      where: { id, paymentStatus: "PENDING" },
      data: {
        paymentStatus: "PROCESSING",
        metadata: {
          ...(order.metadata as object),
          transactionReference: body.data.transactionReference,
          manuallyConfirmedBy: session.user.id,
          manuallyConfirmedAt: new Date().toISOString(),
          confirmationNotes: body.data.notes || null,
        },
      },
    });
    return result.count === 1;
  });
  if (!claimed) {
    return NextResponse.json(
      { error: "Pedido ya procesado o referencia utilizada en otro pedido." },
      { status: 409 }
    );
  }
  const claimedOrder = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { user: true },
  });
  const result = await processApprovedPayment(
    { ...claimedOrder, paymentStatus: "COMPLETED" },
    { transactionId: body.data.transactionReference }
  );
  if (!result.success) {
    await prisma.order.updateMany({
      where: { id, paymentStatus: "PROCESSING" },
      data: { paymentStatus: "PENDING" },
    });
    return NextResponse.json(
      { error: "El pago requiere revisión. No vuelvas a cobrar; puedes reintentar la entrega." },
      { status: 500 }
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { paymentStatus: "COMPLETED" } });
    await tx.manualPayment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        paymentMethod: order.paymentMethod,
        referenceNumber: body.data.transactionReference,
        approved: true,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      update: { approved: true, approvedAt: new Date(), approvedBy: session.user.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: actor.email || "",
        entityType: "order",
        entityId: id,
        action: "MANUAL_PAYMENT_CONFIRMATION",
        before: { paymentStatus: "PENDING" },
        after: { paymentStatus: "COMPLETED" },
        reason: body.data.notes || "Ingreso comprobado en la cuenta receptora",
        metadata: { transactionReference: body.data.transactionReference },
      },
    });
  });
  return NextResponse.json({ success: true });
}
