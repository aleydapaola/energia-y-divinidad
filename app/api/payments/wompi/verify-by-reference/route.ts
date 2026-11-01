// Retired payment entry: no provider, database or email side effects.
export async function GET() {
  return Response.json(
    {
      error: "Esta vía de pago se ha retirado. Usa PayPal o Bre-B desde la web.",
      code: "PAYMENT_METHOD_RETIRED",
    },
    { status: 410 }
  );
}
