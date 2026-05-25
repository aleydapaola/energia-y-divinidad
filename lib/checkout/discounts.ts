import { validateDiscountCode } from "@/lib/discount-codes";

type DiscountProductType = "session" | "pack" | "event" | "course" | "membership";
type DiscountCurrency = "COP" | "USD";

export interface AppliedCheckoutDiscount {
  finalAmount: number;
  discountAmount: number;
  discountCodeId: string | null;
  discountCode: string | null;
  originalAmount: number | null;
}

export async function applyCheckoutDiscount(params: {
  discountCode?: string | null;
  userId?: string | null;
  productType: DiscountProductType;
  amount: number;
  currency: DiscountCurrency;
  courseIds?: string[];
}): Promise<AppliedCheckoutDiscount> {
  const { discountCode, userId, productType, amount, currency, courseIds = [] } = params;

  if (!discountCode?.trim()) {
    return {
      finalAmount: amount,
      discountAmount: 0,
      discountCodeId: null,
      discountCode: null,
      originalAmount: null,
    };
  }

  const result = await validateDiscountCode({
    code: discountCode.trim(),
    userId: userId || "anonymous",
    productType,
    courseIds,
    amount,
    currency,
  });

  if (!result.valid || !result.discountCode) {
    throw new Error(result.error || "Código de descuento inválido");
  }

  return {
    finalAmount: result.finalAmount ?? amount,
    discountAmount: result.discountAmount ?? 0,
    discountCodeId: result.discountCode._id,
    discountCode: result.discountCode.code.toUpperCase(),
    originalAmount: amount,
  };
}
