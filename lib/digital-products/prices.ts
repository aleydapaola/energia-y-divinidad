export function hasProductPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function productPaymentMethods(product: { price?: number; priceUSD?: number }) {
  return [
    ...(hasProductPrice(product.priceUSD) ? ["paypal_direct" as const] : []),
    ...(hasProductPrice(product.price) ? ["breb_manual" as const] : []),
  ];
}
