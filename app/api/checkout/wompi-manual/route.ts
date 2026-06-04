import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { applyCheckoutDiscount } from "@/lib/checkout/discounts";
import { sendSessionBookingRequestEmail } from "@/lib/email";
import { processApprovedPayment } from "@/lib/payment-processor";
import { prisma } from "@/lib/prisma";
import { getSessionMeetingLink } from "@/lib/sanity/queries/sessionConfig";
import { generateWompiReference } from "@/lib/wompi";

interface CheckoutBody {
  // Tipo de producto
  productType: "session" | "pack" | "event" | "course"; // No soporta membership (requiere recurrencia)
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
 * Mapeo de montos a links de pago de Wompi
 * Los links de pago se crean desde el dashboard de Wompi con montos específicos
 * Configurar en variables de entorno:
 * - WOMPI_PAYMENT_LINK_270000 para sesión individual
 * - WOMPI_PAYMENT_LINK_DEFAULT para monto variable (si existe)
 * etc.
 */
function getWompiPaymentLink(amount: number, productType: string): string | null {
  // Intentar obtener link específico por monto
  const linkByAmount = process.env[`WOMPI_PAYMENT_LINK_${amount}`];
  if (linkByAmount) {
    return linkByAmount;
  }

  // Intentar obtener link por tipo de producto
  const productTypeUpper = productType.toUpperCase();
  const linkByType = process.env[`WOMPI_PAYMENT_LINK_${productTypeUpper}`];
  if (linkByType) {
    return linkByType;
  }

  // Usar link por defecto (monto variable) si existe
  const defaultLink = process.env.WOMPI_PAYMENT_LINK_DEFAULT;
  if (defaultLink) {
    return defaultLink;
  }

  return null;
}

/**
 * POST /api/checkout/wompi-manual
 * Crear orden pendiente para pago manual con Wompi (link de pago genérico)
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
      "[CHECKOUT/WOMPI-MANUAL] Request body:",
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

    // Obtener el link de pago de Wompi correspondiente (puede ser null si no está configurado)
    const paymentLinkUrl = getWompiPaymentLink(finalAmount, productType);

    if (!paymentLinkUrl) {
      console.warn(
        "[CHECKOUT/WOMPI-MANUAL] No payment link configured for amount:",
        finalAmount,
        "- proceeding without link"
      );
    }

    // Generar referencia única
    const reference = generateWompiReference("WPM"); // Wompi Manual

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
      paymentMethod: "wompi_manual",
      awaitingManualConfirmation: true,
      wompiPaymentLinkUrl: paymentLinkUrl,
    };

    console.log(
      "[CHECKOUT/WOMPI-MANUAL] Creating order with metadata:",
      JSON.stringify(orderMetadata)
    );

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
        currency: "COP", // Wompi manual solo opera en COP
        paymentMethod: "WOMPI_MANUAL",
        paymentStatus: "PENDING",
        metadata: orderMetadata,
      },
    });

    console.log("[CHECKOUT/WOMPI-MANUAL] Order created:", order.id, "reference:", reference);

    if (productType === "session" && scheduledAt && userEmail) {
      try {
        const meetingLink = await getSessionMeetingLink();
        await sendSessionBookingRequestEmail({
          email: userEmail,
          name: guestName || session?.user?.name || "Cliente",
          sessionName: productName,
          scheduledAt: new Date(scheduledAt),
          duration: null,
          orderNumber: order.orderNumber,
          amount: finalAmount,
          currency: "COP",
          paymentMethodLabel: "Wompi",
          paymentLinkUrl,
          meetingLink,
        });
      } catch (emailError) {
        console.error("[CHECKOUT/WOMPI-MANUAL] Error sending booking request email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentLinkUrl,
      // URL a la que redirigir para mostrar instrucciones de pago
      redirectUrl: `/pago/wompi-pending?ref=${reference}`,
    });
  } catch (error) {
    console.error("[CHECKOUT/WOMPI-MANUAL] Error creating order:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("[CHECKOUT/WOMPI-MANUAL] Error message:", errorMessage);
    return NextResponse.json(
      { error: `Error al crear la orden: ${errorMessage}` },
      { status: 500 }
    );
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
