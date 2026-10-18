import type { WebhookVerificationResult, TransactionStatus, Currency } from "./payments/types";
import type { PayPalWebhookEvent } from "./paypal";

/** PayPal capture events carry the capture itself, rather than an order's purchase units. */
export async function mapPayPalPaymentEvent(
  event: PayPalWebhookEvent,
  getOrderReference: (orderId: string) => Promise<string | undefined>
): Promise<WebhookVerificationResult> {
  const statuses: Record<string, TransactionStatus> = {
    "CHECKOUT.ORDER.APPROVED": "PENDING",
    "PAYMENT.CAPTURE.COMPLETED": "APPROVED",
    "PAYMENT.CAPTURE.DENIED": "DECLINED",
    "PAYMENT.CAPTURE.REFUNDED": "VOIDED",
  };
  const status = statuses[event.event_type];
  const base = {
    valid: true,
    eventType: event.event_type,
    transactionId: event.resource.id,
    rawData: event,
  };
  // Unhandled notifications must not change an order's payment status.
  if (!status) {
    return base;
  }

  const resource = event.resource;
  let reference = resource.purchase_units?.[0]?.reference_id;
  if (!reference && resource.supplementary_data?.related_ids?.order_id) {
    reference = await getOrderReference(resource.supplementary_data.related_ids.order_id);
    if (!reference) {
      throw new Error("Unable to resolve PayPal order reference");
    }
  }
  const money = resource.amount || resource.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
  const amount = money ? Number(money.value) : undefined;
  if (
    money &&
    (typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["USD", "EUR", "COP"].includes(money.currency_code))
  ) {
    throw new Error("Invalid PayPal capture amount or currency");
  }
  if (status === "APPROVED" && (!reference || !money)) {
    throw new Error("PayPal capture is missing its order reference or amount");
  }
  return {
    ...base,
    status,
    reference,
    amount,
    currency: money?.currency_code as Currency | undefined,
  };
}

/** Preserve the original JSON event bytes in PayPal's verification request. */
export function payPalVerificationBody(fields: Record<string, string>, rawBody: string) {
  JSON.parse(rawBody);
  return `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${rawBody}}`;
}
