import { NextRequest, NextResponse } from "next/server";

import { protectCheckoutPayment, CheckoutHoldError } from "@/lib/checkout/holds";
import { canAccessOrder } from "@/lib/order-access";
import { processApprovedPayment } from "@/lib/payment-processor";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

interface CaptureBody {
  paypalOrderId: string;
  reference?: string;
}

/**
 * POST /api/checkout/paypal/capture
 * Capturar pago de PayPal después de la aprobación del usuario
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: "PayPal no está configurado" }, { status: 500 });
    }

    const body: CaptureBody = await request.json();
    const { paypalOrderId, reference } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ error: "paypalOrderId es requerido" }, { status: 400 });
    }

    console.log("[PAYPAL/CAPTURE] Capturing order:", paypalOrderId);

    // Buscar la orden en nuestra BD
    let order = await prisma.order.findFirst({
      where: {
        paymentMethod: { in: ["PAYPAL_DIRECT", "PAYPAL_CARD"] },
        ...(reference ? { orderNumber: reference } : {}),
        metadata: { path: ["paypalOrderId"], equals: paypalOrderId },
      },
      include: { user: true },
    });

    if (!order) {
      console.error("[PAYPAL/CAPTURE] Order not found for:", { paypalOrderId, reference });
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (!(await canAccessOrder(order))) {
      return NextResponse.json({ error: "Pedido no disponible en esta sesión." }, { status: 404 });
    }

    // Si ya está completada, retornar éxito
    if (order.paymentStatus === "COMPLETED") {
      const delivered = await processApprovedPayment(order);
      if (!delivered.success) {
        return NextResponse.json(
          { error: "Pago recibido; entrega pendiente de revisión." },
          { status: 503 }
        );
      }
      console.log("[PAYPAL/CAPTURE] Order already completed:", order.orderNumber);
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        reference: order.orderNumber,
        alreadyProcessed: true,
      });
    }

    if (!["PENDING", "PROCESSING"].includes(order.paymentStatus)) {
      return NextResponse.json({ error: "Este pedido no admite cobros." }, { status: 409 });
    }
    // Inventory becomes non-expiring before the external call. Keep it on an
    // uncertain response; a provider retry always uses the same idempotency key.
    await protectCheckoutPayment(order.id, "CAPTURING");
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (!captureResult.success) {
      console.error("[PAYPAL/CAPTURE] Capture failed:", captureResult.error);

      // Actualizar orden como fallida
      await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: "PENDING" },
        data: {
          metadata: {
            ...(order.metadata as object),
            captureError: captureResult.error,
            captureAttemptedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json(
        { error: captureResult.error || "Error al capturar el pago" },
        { status: 500 }
      );
    }

    if (
      captureResult.status !== "COMPLETED" ||
      captureResult.currency !== order.currency ||
      Math.round(Number(captureResult.amount) * 100) !== Math.round(Number(order.amount) * 100)
    ) {
      return NextResponse.json(
        { error: "El pago no coincide con el pedido o sigue pendiente de confirmación." },
        { status: 409 }
      );
    }
    console.log("[PAYPAL/CAPTURE] Capture verified:", captureResult.captureId);

    // Actualizar orden como completada
    order = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "COMPLETED",
        metadata: {
          ...(order.metadata as object),
          paypalCaptureId: captureResult.captureId,
          paypalCaptureStatus: captureResult.status,
          paypalPayerEmail: captureResult.payerEmail,
          capturedAt: new Date().toISOString(),
        },
      },
      include: { user: true },
    });

    // Procesar el pago aprobado (crear membresía, booking, etc.)
    try {
      const delivery = await processApprovedPayment(order, {
        transactionId: captureResult.captureId,
      });
      if (!delivery.success) {
        return NextResponse.json(
          { error: "Pago recibido; entrega pendiente. No repitas el pago." },
          { status: 503 }
        );
      }
      console.log("[PAYPAL/CAPTURE] Payment processed successfully for:", order.orderNumber);
    } catch (processError) {
      console.error("[PAYPAL/CAPTURE] Error processing approved payment:", processError);
      // El pago ya fue capturado, así que no fallamos aquí
      // Pero registramos el error para investigación
      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...(order.metadata as object),
            processingError: processError instanceof Error ? processError.message : "Unknown error",
          },
        },
      });
      return NextResponse.json(
        { error: "Pago recibido; entrega pendiente. No repitas el pago." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      reference: order.orderNumber,
      captureId: captureResult.captureId,
    });
  } catch (error) {
    if (error instanceof CheckoutHoldError || (error instanceof Error && "status" in error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[PAYPAL/CAPTURE] Error:", error);
    return NextResponse.json({ error: "Error al procesar la captura" }, { status: 500 });
  }
}
