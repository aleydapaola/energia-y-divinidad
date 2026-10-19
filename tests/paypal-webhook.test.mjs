import assert from "node:assert/strict";
import { test } from "node:test";

import { mapPayPalPaymentEvent, payPalVerificationBody } from "../lib/paypal-webhook.ts";
const capture = {
  id: "WH-TEST",
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource_type: "capture",
  create_time: "2026-10-18T12:00:00Z",
  resource: {
    id: "CAPTURE-TEST",
    status: "COMPLETED",
    amount: { value: "50.00", currency_code: "USD" },
    supplementary_data: { related_ids: { order_id: "ORDER-TEST" } },
  },
};
test("resolves the internal reference from the order related to a capture", async () => {
  const requested = [];
  const result = await mapPayPalPaymentEvent(capture, async (id) => {
    requested.push(id);
    return "EYD-TEST";
  });
  assert.deepEqual(requested, ["ORDER-TEST"]);
  assert.equal(result.reference, "EYD-TEST");
  assert.equal(result.transactionId, "CAPTURE-TEST");
  assert.equal(result.status, "APPROVED");
  assert.equal(result.amount, 50);
  assert.equal(result.currency, "USD");
});
test("keeps order approvals pending and uses their reference without another API call", async () => {
  const event = {
    ...capture,
    event_type: "CHECKOUT.ORDER.APPROVED",
    resource: {
      id: "ORDER-TEST",
      status: "APPROVED",
      purchase_units: [{ reference_id: "EYD-TEST" }],
    },
  };
  const result = await mapPayPalPaymentEvent(event, async () => {
    throw Error("unexpected lookup");
  });
  assert.equal(result.status, "PENDING");
  assert.equal(result.reference, "EYD-TEST");
});
test("fails for an unresolved captured order instead of silently acknowledging it", async () => {
  await assert.rejects(
    mapPayPalPaymentEvent(capture, async () => undefined),
    /resolve/
  );
});
test("does not process a capture without an order reference", async () => {
  await assert.rejects(
    mapPayPalPaymentEvent(
      { ...capture, resource: { ...capture.resource, supplementary_data: undefined } },
      async () => undefined
    ),
    /missing/
  );
});
for (const amount of [
  { value: "NaN", currency_code: "USD" },
  { value: "0", currency_code: "USD" },
  { value: "50", currency_code: "XXX" },
]) {
  test(`rejects invalid money ${amount.value} ${amount.currency_code}`, async () => {
    await assert.rejects(
      mapPayPalPaymentEvent(
        { ...capture, resource: { ...capture.resource, amount } },
        async () => "EYD-TEST"
      ),
      /Invalid/
    );
  });
}
test("unknown events cannot regress a paid order to pending", async () => {
  const result = await mapPayPalPaymentEvent(
    { ...capture, event_type: "PAYMENT.CAPTURE.PENDING" },
    async () => {
      throw Error("unexpected lookup");
    }
  );
  assert.equal(result.status, undefined);
  assert.equal(result.reference, undefined);
});

test("signature verification preserves the original event JSON", () => {
  const raw = '{ "id": "WH-TEST", "number": 1.00, "resource": { "id": "CAPTURE-TEST" } }';
  const body = payPalVerificationBody(
    { webhook_id: "HOOK-TEST", transmission_sig: "signature" },
    raw
  );
  assert.ok(body.endsWith(`"webhook_event":${raw}}`));
  assert.equal(JSON.parse(body).webhook_id, "HOOK-TEST");
  assert.deepEqual(JSON.parse(body).webhook_event, JSON.parse(raw));
});
