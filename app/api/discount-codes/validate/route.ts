import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { validateDiscountCode, formatDiscount } from "@/lib/discount-codes";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";

    const body = await request.json();
    const { code, productType, courseIds, amount, currency } = body;

    if (!code) {
      return NextResponse.json({ valid: false, error: "El código es requerido" }, { status: 400 });
    }

    if (!productType) {
      return NextResponse.json(
        { valid: false, error: "El tipo de producto es requerido" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ valid: false, error: "El monto es inválido" }, { status: 400 });
    }

    if (!currency || !["COP", "USD"].includes(currency)) {
      return NextResponse.json(
        { valid: false, error: "La moneda debe ser COP o USD" },
        { status: 400 }
      );
    }

    const result = await validateDiscountCode({
      code,
      userId,
      productType,
      courseIds: courseIds || [],
      amount,
      currency,
    });

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      });
    }

    return NextResponse.json({
      valid: true,
      discountCode: result.discountCode!.code,
      discountCodeId: result.discountCode!._id,
      discountType: result.discountCode!.discountType,
      discountValue: result.discountCode!.discountValue,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      formattedDiscount: formatDiscount(result.discountCode!),
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    return NextResponse.json(
      { valid: false, error: "Error al validar el código" },
      { status: 500 }
    );
  }
}
