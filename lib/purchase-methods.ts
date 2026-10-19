import type { PaymentMethodType } from "@/lib/membership-access";
export function purchaseMethods(
  region: string
): { method: PaymentMethodType; label: string; description: string }[] {
  return [
    {
      method: "paypal_direct",
      label: "PayPal",
      description: "Pago en USD · confirmación automática tras verificar el pago",
    },
    ...(region === "colombia"
      ? [
          {
            method: "breb_manual" as PaymentMethodType,
            label: "Bre-B · Global66",
            description: "Pago en COP con llave o QR disponible · verificación del ingreso",
          },
        ]
      : []),
  ];
}
