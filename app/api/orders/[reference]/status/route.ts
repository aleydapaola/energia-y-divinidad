import { NextRequest, NextResponse } from "next/server";

import { getBrebConfiguration, getOrderBrebQr } from "@/lib/breb";
import { canAccessOrder } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders/[reference]/status
 * Consultar estado de una orden por su referencia (orderNumber)
 *
 * Query params:
 * - verify=true: Verificar con Wompi si el pago está pendiente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json({ error: "Referencia requerida" }, { status: 400 });
    }

    // Buscar orden por orderNumber
    const order = await prisma.order.findFirst({
      where: { orderNumber: reference },
      select: {
        id: true,
        userId: true,
        manualPayment: { select: { referenceNumber: true, approved: true } },
        orderNumber: true,
        orderType: true,
        itemId: true,
        itemName: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        paymentStatus: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod === "BREB_MANUAL" && !(await canAccessOrder(order))) {
      return NextResponse.json({ error: "Pedido no disponible en esta sesión." }, { status: 404 });
    }
    const paymentStatus = order.paymentStatus;
    const metadata = order.metadata as Record<string, any> | null;

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      itemName: order.itemName,
      itemId: order.itemId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      metadata: {
        isGuestCheckout: !!metadata?.isGuestCheckout,
        convertedFromGuest: !!metadata?.convertedFromGuest,
        userWasCreated: !!metadata?.userWasCreated,
      },
      ...(order.paymentMethod === "BREB_MANUAL"
        ? {
            breb: getBrebConfiguration(),
            qrCodeUrl: getOrderBrebQr(metadata || {}, Number(order.amount)),
            reported: !!order.manualPayment,
            reportedReference: order.manualPayment?.referenceNumber,
          }
        : {}),
      paymentStatus,
      amount: Number(order.amount),
    });
  } catch (error) {
    console.error("Error fetching order status:", error);
    return NextResponse.json({ error: "Error al consultar orden" }, { status: 500 });
  }
}
