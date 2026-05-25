import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { applyCheckoutDiscount } from "@/lib/checkout/discounts";
import { processApprovedPayment } from "@/lib/payment-processor";
import { prisma } from "@/lib/prisma";
import { generateWompiReference } from "@/lib/wompi";

interface CheckoutBody {
  // Tipo de producto
  productType: "session" | "pack" | "event"; // No soporta membership (requiere recurrencia)
  productId: string;
  productName: string;

  // Monto (solo COP)
  amount: number;

  // Guest checkout fields
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;

  discountCode?: string;

  // Para sesiones/eventos
  scheduledAt?: string; // ISO date string para la fecha/hora de la sesión
  seats?: number;
  notes?: string;
}

/**
 * POST /api/checkout/breb
 * Crear orden pendiente para pago manual con Bre-B (llave Bancolombia)
 * Solo para Colombia (COP) - pagos no recurrentes
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    const body: CheckoutBody = await request.json();
    const {
      productType,
      productId,
      productName,
      amount,
      guestEmail,
      guestName,
      guestPhone,
      scheduledAt,
      seats,
      notes,
      discountCode,
    } = body;

    console.log(
      "[CHECKOUT/BREB] Request body:",
      JSON.stringify({
        productType,
        productId,
        productName,
        amount,
        scheduledAt,
      })
    );

    // Determinar si es usuario autenticado o guest checkout
    const isAuthenticated = !!session?.user?.id;
    const userEmail = session?.user?.email || guestEmail;

    // Si no está autenticado, requiere email de invitado
    if (!isAuthenticated && !guestEmail) {
      return NextResponse.json({ error: "Se requiere email para continuar" }, { status: 400 });
    }

    // Nota: Bre-B manual NO soporta membresías (requieren pago recurrente automático)
    // El tipo productType ya lo restringe a 'session' | 'pack' | 'event'

    // Validaciones básicas
    if (!productType || !productId || !productName || !amount) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Validar que el monto sea positivo
    if (amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    let discount: Awaited<ReturnType<typeof applyCheckoutDiscount>>;
    try {
      discount = await applyCheckoutDiscount({
        discountCode,
        userId: session?.user?.id,
        productType,
        amount,
        currency: "COP",
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Código de descuento inválido" },
        { status: 400 }
      );
    }

    const finalAmount = discount.finalAmount;

    if (finalAmount === 0) {
      const reference = generateWompiReference("FREE");
      const order = await prisma.order.create({
        data: {
          userId: isAuthenticated ? session!.user!.id : undefined,
          guestEmail: !isAuthenticated ? guestEmail : undefined,
          guestName: !isAuthenticated ? guestName : undefined,
          orderNumber: reference,
          orderType: getOrderType(productType),
          itemId: productId,
          itemName: productName,
          amount: 0,
          originalAmount: discount.originalAmount,
          discountAmount: discount.discountAmount,
          discountCodeId: discount.discountCodeId,
          discountCode: discount.discountCode,
          currency: "COP",
          paymentMethod: "FREE",
          paymentStatus: "COMPLETED",
          metadata: {
            productType,
            isGuestCheckout: !isAuthenticated,
            customerEmail: userEmail,
            customerName: guestName || session?.user?.name || null,
            customerPhone: guestPhone || null,
            scheduledAt: scheduledAt || null,
            seats: seats || null,
            notes: notes || null,
            freeOrder: true,
          },
        },
        include: { user: true },
      });

      const result = await processApprovedPayment(order);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "No se pudo completar la orden gratuita" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        freeOrder: true,
        reference,
        orderId: order.id,
        orderNumber: order.orderNumber,
        redirectUrl: `/pago/confirmacion?ref=${reference}`,
      });
    }

    // Generar referencia única
    const reference = generateWompiReference("BREB");

    // Crear orden pendiente en la base de datos
    const orderMetadata = {
      productType,
      isGuestCheckout: !isAuthenticated,
      customerEmail: userEmail,
      customerName: guestName || session?.user?.name || null,
      customerPhone: guestPhone || null,
      scheduledAt: scheduledAt || null,
      seats: seats || null,
      notes: notes || null,
      paymentMethod: "breb_manual",
      awaitingManualConfirmation: true,
    };

    console.log("[CHECKOUT/BREB] Creating order with metadata:", JSON.stringify(orderMetadata));

    const order = await prisma.order.create({
      data: {
        userId: isAuthenticated ? session!.user!.id : undefined,
        guestEmail: !isAuthenticated ? guestEmail : undefined,
        guestName: !isAuthenticated ? guestName : undefined,
        orderNumber: reference,
        orderType: getOrderType(productType),
        itemId: productId,
        itemName: productName,
        amount: finalAmount,
        originalAmount: discount.originalAmount,
        discountAmount: discount.discountAmount > 0 ? discount.discountAmount : null,
        discountCodeId: discount.discountCodeId,
        discountCode: discount.discountCode,
        currency: "COP", // Bre-B solo opera en COP
        paymentMethod: "BREB_MANUAL",
        paymentStatus: "PENDING",
        metadata: orderMetadata,
      },
    });

    console.log("[CHECKOUT/BREB] Order created:", order.id, "reference:", reference);

    return NextResponse.json({
      success: true,
      reference,
      orderId: order.id,
      orderNumber: order.orderNumber,
      // URL a la que redirigir para mostrar instrucciones de pago
      redirectUrl: `/pago/breb-pending?ref=${reference}`,
    });
  } catch (error) {
    console.error("[CHECKOUT/BREB] Error creating order:", error);
    return NextResponse.json({ error: "Error al crear la orden" }, { status: 500 });
  }
}

function getOrderType(
  productType: string
): "PRODUCT" | "SESSION" | "EVENT" | "MEMBERSHIP" | "PREMIUM_CONTENT" | "COURSE" {
  switch (productType) {
    case "session":
    case "pack":
      return "SESSION";
    case "event":
      return "EVENT";
    case "course":
      return "COURSE";
    default:
      return "PRODUCT";
  }
}
