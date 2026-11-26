export function hasProductPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function productPaymentMethods(product: { price?: number; priceUSD?: number }) {
  return [
    ...(hasProductPrice(product.priceUSD) ? ["paypal_direct" as const] : []),
    ...(hasProductPrice(product.price) ? ["breb_manual" as const] : []),
  ];
}

export function digitalCartPaymentMethods(products: readonly Parameters<typeof productPaymentMethods>[0][]) {
  const [first, ...rest] = products;
  if (!first) {
    return [];
  }
  return productPaymentMethods(first).filter((method) =>
    rest.every((product) => productPaymentMethods(product).includes(method))
  );
}
