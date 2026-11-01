import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/subscriptions/[id]/status
 * Obtener estado actual de una suscripción
 * Solo lectura: los pagos y acuerdos se verifican en sus handlers de PayPal.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentProvider: true,
        membershipTierId: true,
        membershipTierName: true,
        billingInterval: true,
        amount: true,
        currency: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    // Verificar que la suscripción pertenece al usuario
    if (subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para ver esta suscripción" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...subscription,
      amount: subscription.amount.toNumber(),
      statusChanged: false,
    });
  } catch (error) {
    console.error("Error obteniendo estado de suscripción:", error);
    return NextResponse.json({ error: "Error al obtener estado de suscripción" }, { status: 500 });
  }
}
