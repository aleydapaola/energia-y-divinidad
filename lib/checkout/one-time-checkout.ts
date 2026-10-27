import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getBrebConfiguration } from "@/lib/breb";
import { quoteCatalogItem } from "@/lib/checkout/catalog-quote";
import { applyCheckoutDiscount } from "@/lib/checkout/discounts";
import { createHeldCheckoutOrder, releaseUnpaidCheckoutHold } from "@/lib/checkout/holds";
import { assertEventCapacity } from "@/lib/events/capacity";
import { allowOrderInBrowser } from "@/lib/order-access";
import { processApprovedPayment } from "@/lib/payment-processor";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";
import { assertSessionTimeAvailable, schedulingConfig } from "@/lib/session-scheduling";
import { getAppUrl } from "@/lib/utils";

const inputSchema = z.object({
  productType: z.enum(["session", "pack", "event", "course", "product"]),
  productId: z.string().min(1).max(150),
  guestEmail: z.string().email().max(254).optional(),
  guestName: z.string().max(120).optional(),
  guestPhone: z.string().max(40).optional(),
  scheduledAt: z.string().datetime().optional(),
  seats: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(2000).optional(),
  discountCode: z.string().max(100).optional(),
  currency: z.enum(["COP", "USD"]).optional(),
  amount: z.number().positive().finite().optional(),
});

export async function oneTimeCheckout(request: NextRequest, method: "breb" | "paypal") {
  const limited = applyRateLimit(request, { maxRequests: 10, windowMs: 60000 });
  if (limited) {
    return limited;
  }
  try {
    const session = await auth();
    const body = inputSchema.parse(await request.json());
    const email = session?.user?.email || body.guestEmail;
    if (!email) {
      return NextResponse.json(
        { error: "Introduce tu correo para recibir el pedido." },
        { status: 400 }
      );
    }
    if (method === "breb" && !getBrebConfiguration().enabled) {
      return NextResponse.json(
        { error: "Bre-B aún no está disponible. Puedes pagar con PayPal." },
        { status: 503 }
      );
    }
    if (method === "paypal" && !isPayPalConfigured()) {
      return NextResponse.json({ error: "PayPal no está disponible." }, { status: 503 });
    }
    const currency = method === "breb" ? "COP" : "USD";
    const quote = await quoteCatalogItem({ ...body, currency });
    if (body.productType === "event") {
      await assertEventCapacity(
        prisma,
        { _id: quote.productId, capacity: quote.capacity },
        quote.metadata.seats
      );
    }
    // Fast validation; order + actual hold are committed under the shared resource lock below.
    if (body.productType === "session" && body.scheduledAt) {
      await assertSessionTimeAvailable(
        prisma,
        await schedulingConfig(),
        new Date(body.scheduledAt)
      );
    }
    if (
      body.amount !== undefined &&
      Math.round(body.amount * 100) !== Math.round(quote.amount * 100)
    ) {
      throw new Error(
        "El precio ha cambiado. Recarga la página para revisar el importe antes de pagar."
      );
    }
    if (body.productType === "product" && body.discountCode) {
      throw new Error("Los descuentos de este producto aún no están habilitados.");
    }
    const discount = await applyCheckoutDiscount({
      discountCode: body.discountCode,
      userId: session?.user?.id,
      productType: body.productType === "product" ? "course" : body.productType,
      amount: quote.amount,
      currency,
      courseIds: body.productType === "course" ? [quote.productId] : [],
    });
    const reference = `${method === "breb" ? "BREB" : "PP"}-${randomUUID()}`;
    await allowOrderInBrowser(reference);
    const order = await createHeldCheckoutOrder(
      {
        userId: session?.user?.id || null,
        guestEmail: session?.user?.id ? null : email,
        guestName: session?.user?.id ? null : body.guestName || null,
        orderNumber: reference,
        orderType: quote.orderType,
        itemId: quote.productId,
        itemName: quote.productName,
        amount: discount.finalAmount,
        originalAmount: discount.originalAmount,
        discountAmount: discount.discountAmount,
        discountCodeId: discount.discountCodeId,
        discountCode: discount.discountCode,
        currency,
        paymentMethod:
          discount.finalAmount === 0 ? "FREE" : method === "breb" ? "BREB_MANUAL" : "PAYPAL_DIRECT",
        paymentStatus: discount.finalAmount === 0 ? "COMPLETED" : "PENDING",
        metadata: {
          ...quote.metadata,
          isGuestCheckout: !session?.user?.id,
          customerEmail: email,
          customerName: session?.user?.name || body.guestName || null,
          customerPhone: body.guestPhone || null,
          notes: body.notes || null,
          brebSimulation: method === "breb" && getBrebConfiguration().simulation,
        },
      },
      quote.capacity ?? null
    );
    if (discount.finalAmount === 0) {
      const result = await processApprovedPayment(order);
      if (!result.success) {
        return NextResponse.json(
          { error: "Pedido recibido; la entrega requiere revisión." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        reference,
        freeOrder: true,
        redirectUrl: `/pago/confirmacion?ref=${reference}`,
      });
    }
    if (method === "breb") {
      return NextResponse.json({
        success: true,
        reference,
        redirectUrl: `/pago/breb-pending?ref=${reference}`,
      });
    }
    const result = await createPayPalOrder({
      amount: discount.finalAmount,
      currency,
      reference,
      description: quote.productName,
      customerEmail: email,
      returnUrl: `${getAppUrl()}/pago/confirmacion?ref=${reference}`,
      cancelUrl: `${getAppUrl()}/pago/cancelado?ref=${reference}`,
    });
    if (!result.success || !result.orderId || !result.approvalUrl) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
      await releaseUnpaidCheckoutHold(order.id);
      return NextResponse.json(
        { error: "No se pudo iniciar PayPal. Inténtalo de nuevo." },
        { status: 502 }
      );
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { metadata: { ...(order.metadata as object), paypalOrderId: result.orderId } },
    });
    return NextResponse.json({ success: true, reference, approvalUrl: result.approvalUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Revisa los datos de la compra."
            : error instanceof Error
              ? error.message
              : "No se pudo crear el pedido.",
      },
      { status: 400 }
    );
  }
}
