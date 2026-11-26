import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getBrebConfiguration } from "@/lib/breb";
import { quoteCatalogItem } from "@/lib/checkout/catalog-quote";
import { allowOrderInBrowser } from "@/lib/order-access";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

type DigitalCheckout = {
  method: "paypal" | "breb";
  currency: "USD" | "COP";
  body: {
    productId?: string;
    amount?: number;
    products?: { id: string; amount: number }[];
    checkoutKey?: string;
    discountCode?: string;
    guestName?: string;
  };
  email: string;
  userId?: string;
  name?: string;
};

const inCents = (amount: number) => Math.round(amount * 100);

export async function checkoutDigitalProducts({ method, currency, body, email, userId, name }: DigitalCheckout) {
  if (body.discountCode || (body.products && body.productId) || (body.products && !body.checkoutKey)) {
    throw new Error("Revisa los datos de la compra.");
  }
  const selection = body.products ?? (body.productId ? [{ id: body.productId, amount: body.amount }] : []);
  const ids = selection.map(({ id }) => id);
  if (!ids.length || new Set(ids).size !== ids.length) {
    throw new Error("Selecciona productos diferentes para continuar.");
  }
  const breb = method === "breb" ? getBrebConfiguration() : null;
  if (breb ? !breb.enabled : !isPayPalConfigured()) {
    return NextResponse.json({ error: "El método de pago no está disponible." }, { status: 503 });
  }
  const buyer = userId ? await prisma.user.findUnique({
    where: { id: userId }, select: { email: true, emailVerified: true },
  }) : null;
  if (userId && !buyer?.email) {
    throw new Error("Tu cuenta necesita un correo para recibir la compra.");
  }
  const recipient = (buyer?.email || email).trim().toLowerCase();
  const quotes = await Promise.all(selection.map(async ({ id, amount }) => {
    const quote = await quoteCatalogItem({
      productType: "product", productId: id, currency, snapshotProductFiles: true,
    });
    const cents = inCents(quote.amount);
    if (cents < 1 || (amount !== undefined && inCents(amount) !== cents)) {
      throw new Error("El precio ha cambiado. Actualiza el carrito antes de pagar.");
    }
    return { ...quote, cents };
  }));
  const hasDrive = quotes.some((quote) => quote.driveDelivery);
  if (hasDrive && !buyer?.emailVerified) {
    return NextResponse.json({ error: "Inicia sesión con un correo verificado para recibir el acceso en Drive." }, { status: 403 });
  }
  const total = quotes.reduce((sum, quote) => sum + quote.cents, 0);
  if (body.amount !== undefined && inCents(body.amount) !== total) {
    throw new Error("El importe no coincide con el precio actual.");
  }
  if (total > 9_999_999_999) {
    throw new Error("El importe supera el límite del pedido.");
  }
  const paymentMethod = method === "breb" ? "BREB_MANUAL" : "PAYPAL_DIRECT";
  const checkoutKeyHash = body.checkoutKey
    ? createHash("sha256").update(body.checkoutKey).digest("hex")
    : null;

  const order = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`digital-checkout:${recipient}`}))`;
    const existingBuyerId = userId ?? (await tx.user.findUnique({
      where: { email: recipient }, select: { id: true },
    }))?.id;
    if (existingBuyerId && await tx.entitlement.findFirst({
      where: {
        userId: existingBuyerId, type: "PRODUCT", resourceId: { in: ids }, revoked: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })) {
      throw new Error("Uno de los productos ya está disponible en Mis compras.");
    }
    const existing = await tx.order.findFirst({
      where: {
        orderType: "PRODUCT",
        paymentStatus: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
        OR: [{ guestEmail: recipient }, ...(existingBuyerId ? [{ userId: existingBuyerId }] : [])],
        digitalProducts: { some: { productId: { in: ids } } },
      },
      include: { digitalProducts: true },
    });
    if (existing) {
      const metadata = existing.metadata as { checkoutKeyHash?: string } | null;
      const sameBuyer = userId ? existing.userId === userId : !!checkoutKeyHash && metadata?.checkoutKeyHash === checkoutKeyHash;
      if (sameBuyer && existing.paymentStatus === "PENDING" && existing.paymentMethod === paymentMethod &&
          existing.digitalProducts.length === quotes.length &&
          existing.digitalProducts.every((line) => quotes.some((quote) =>
            quote.productId === line.productId && quote.cents === inCents(Number(line.amount))))) {
        return existing;
      }
      throw new Error("Ya existe un pedido con uno de estos productos. Revisa su estado antes de volver a pagar.");
    }
    return tx.order.create({
      data: {
        userId,
        guestEmail: userId ? null : recipient,
        guestName: userId ? null : body.guestName,
        orderNumber: `${method === "breb" ? "BREB" : "PP"}-${randomUUID()}`,
        orderType: "PRODUCT",
        itemId: quotes[0].productId,
        itemName: quotes.map(({ productName }) => productName).join(", "),
        amount: total / 100,
        currency,
        paymentMethod,
        metadata: {
          productType: "product",
          digitalProductOrder: true,
          customerEmail: recipient,
          customerName: name || body.guestName || null,
          isGuestCheckout: !userId,
          brebSimulation: breb?.simulation ?? false,
          checkoutKeyHash,
          ...(hasDrive ? { deliveryProvider: "GOOGLE_DRIVE" } : {}),
        },
        digitalProducts: { create: quotes.map((quote) => ({
          productId: quote.productId,
          title: quote.productName,
          amount: quote.cents / 100,
          currency,
          ...(quote.legacyFiles ? { legacyFiles: quote.legacyFiles } : {}),
          ...(quote.driveDelivery ? {
            driveDelivery: { create: { ...quote.driveDelivery, recipientEmail: recipient } },
          } : {}),
        })) },
      },
      include: { digitalProducts: true },
    });
  });

  const reference = order.orderNumber;
  await allowOrderInBrowser(reference);
  if (method === "breb") {
    return NextResponse.json({ success: true, reference, redirectUrl: `/pago/breb-pending?ref=${reference}` });
  }
  const metadata = (order.metadata || {}) as { paypalOrderId?: string; paypalApprovalUrl?: string };
  if (metadata.paypalOrderId && metadata.paypalApprovalUrl) {
    return NextResponse.json({ success: true, reference, approvalUrl: metadata.paypalApprovalUrl });
  }
  // PayPal retains create idempotency keys for six hours by default. Leave an
  // uncertain order pending beyond that window for reconciliation.
  if (Date.now() - order.createdAt.getTime() >= 5 * 60 * 60_000) {
    return NextResponse.json({ error: "El pedido requiere revisión. No repitas el pago." }, { status: 409 });
  }
  const result = await createPayPalOrder({
    amount: Number(order.amount),
    currency,
    reference,
    description: order.itemName.slice(0, 127),
    customerEmail: recipient,
    returnUrl: `${getAppUrl()}/pago/confirmacion?ref=${reference}`,
    cancelUrl: `${getAppUrl()}/pago/cancelado?ref=${reference}`,
  }, order.id);
  if (!result.success || !result.orderId || !result.approvalUrl) {
    return NextResponse.json({ error: "PayPal no ha confirmado el pedido. Reintenta desde esta página." }, { status: 502 });
  }
  await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: { metadata: { ...metadata, paypalOrderId: result.orderId, paypalApprovalUrl: result.approvalUrl } },
  });
  return NextResponse.json({ success: true, reference, approvalUrl: result.approvalUrl });
}
