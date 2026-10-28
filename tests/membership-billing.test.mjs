import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const billing = loadMembership("lib/membership-billing.ts");
const intent = loadMembership("lib/membership-intent.ts");
const policy = loadMembership("lib/commercial-policy.ts");
const quote = { planId: "P-TEST", amount: 22, currency: "USD", interval: "monthly" };
const plan = {
  id: "P-TEST",
  status: "ACTIVE",
  billing_cycles: [
    {
      tenure_type: "REGULAR",
      total_cycles: 0,
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      pricing_scheme: { fixed_price: { value: "22.00", currency_code: "USD" } },
    },
  ],
};
const details = {
  id: "I-TEST",
  customId: "order-test",
  planId: "P-TEST",
  status: "ACTIVE",
  startTime: "2026-11-27T15:00:00Z",
};

test("membership plans bind exact amount, currency and cycle and cannot add a second trial/setup fee", () => {
  assert.doesNotThrow(() => billing.assertMembershipPlan(plan, quote, { newAgreement: true }));
  for (const mutate of [
    (p) => {
      p.id = "P-OTHER";
    },
    (p) => {
      p.status = "INACTIVE";
    },
    (p) => {
      p.billing_cycles[0].frequency.interval_unit = "YEAR";
    },
    (p) => {
      p.billing_cycles[0].pricing_scheme.fixed_price.currency_code = "EUR";
    },
    (p) => {
      p.billing_cycles[0].pricing_scheme.fixed_price.value = "21.99";
    },
    (p) => {
      p.billing_cycles[0].total_cycles = 1;
    },
    (p) => {
      p.billing_cycles.push({ tenure_type: "TRIAL" });
    },
    (p) => {
      p.payment_preferences = { setup_fee: { value: "1.00" } };
    },
    (p) => {
      p.quantity_supported = true;
    },
    (p) => {
      p.taxes = { percentage: "19" };
    },
  ]) {
    const changed = structuredClone(plan);
    mutate(changed);
    assert.throws(() => billing.assertMembershipPlan(changed, quote, { newAgreement: true }));
  }
  assert.doesNotThrow(() => billing.assertMembershipPlan({ ...plan, status: "INACTIVE" }, quote));
  for (const invalid of [null, undefined, true, -1, NaN, Infinity, "1e2", "1.001", 1.001, ""]) {
    assert.throws(() => billing.moneyMinor(invalid));
  }
});

test("trial access needs an approved provider agreement bound to its owner order, plan and exact start", () => {
  const expected = {
    subscriptionId: "I-TEST",
    orderId: "order-test",
    planId: "P-TEST",
    trialEndsAt: details.startTime,
  };
  billing.assertMembershipAgreement(details, expected);
  for (const change of [
    { customId: "foreign-order" },
    { id: "I-OTHER" },
    { planId: "P-OTHER" },
    { quantity: "2" },
    { planOverridden: true },
    { startTime: "2026-12-27T15:00:00Z" },
  ]) {
    assert.throws(() => billing.assertMembershipAgreement({ ...details, ...change }, expected));
  }
  const now = new Date("2026-10-28T15:00:00Z");
  assert.equal(billing.approvedForTrial(details, details.startTime, now), true);
  for (const status of ["APPROVAL_PENDING", "CANCELLED", "SUSPENDED", "EXPIRED"]) {
    assert.equal(billing.approvedForTrial({ ...details, status }, details.startTime, now), false);
  }
  assert.equal(billing.approvedForTrial(details, now.toISOString(), now), false);
});

test("membership periods clamp month/year ends and trial eligibility uses CMS days only once", () => {
  for (const [from, interval, to] of [
    ["2027-01-31", "monthly", "2027-02-28"],
    ["2028-01-31", "monthly", "2028-02-29"],
    ["2028-02-29", "yearly", "2029-02-28"],
  ]) {
    assert.equal(
      billing.membershipPeriodEnd(new Date(from + "T15:00:00Z"), interval).toISOString(),
      to + "T15:00:00.000Z"
    );
  }
  assert.equal(
    intent.eligibleTrialDays({ trialPeriod: { enabled: true, durationDays: 30 } }, false),
    30
  );
  assert.equal(
    intent.eligibleTrialDays({ trialPeriod: { enabled: true, durationDays: 30 } }, true),
    0
  );
  assert.throws(() =>
    intent.eligibleTrialDays({ trialPeriod: { enabled: true, durationDays: 0 } }, false)
  );
  const consent = {
    acceptedTerms: true,
    acceptedRecurring: true,
    termsVersion: policy.COMMERCIAL_POLICY_VERSION,
  };
  intent.assertRecurringConsent(consent);
  for (const changed of [
    { acceptedTerms: false },
    { acceptedRecurring: false },
    { termsVersion: "old" },
  ]) {
    assert.throws(() => intent.assertRecurringConsent({ ...consent, ...changed }));
  }
});

test("renewals use authenticated sale facts and old sales cannot become the current period", () => {
  const sale = {
    id: "SALE-1",
    state: "completed",
    billing_agreement_id: "I-TEST",
    create_time: "2027-01-31T15:00:00Z",
    amount: { total: "22.00", currency: "USD" },
  };
  const provider = {
    ...details,
    nextBillingTime: "2027-02-28T15:00:00Z",
    lastPaymentTime: sale.create_time,
  };
  const expected = { ...quote, subscriptionId: "I-TEST" };
  const now = new Date("2027-02-01T00:00:00Z");
  assert.equal(
    billing.verifiedSalePeriod(sale, provider, expected, now).end.toISOString(),
    "2027-02-28T15:00:00.000Z"
  );
  for (const changed of [
    { state: "pending" },
    { billing_agreement_id: "I-OTHER" },
    { amount: { total: "21.99", currency: "USD" } },
    { amount: { total: "22.00", currency: "EUR" } },
    { create_time: "bad" },
    { create_time: "2030-01-01T15:00:00Z" },
  ]) {
    assert.throws(() =>
      billing.verifiedSalePeriod({ ...sale, ...changed }, provider, expected, now)
    );
  }
  assert.equal(
    billing.verifiedSalePeriod(
      sale,
      {
        ...provider,
        lastPaymentTime: "2027-02-28T15:00:00Z",
        nextBillingTime: "2027-03-31T15:00:00Z",
      },
      expected,
      now
    ).isLatest,
    false
  );
});
