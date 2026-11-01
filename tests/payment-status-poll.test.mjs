import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const { pollPaymentStatus } = loadMembership("lib/payment-status-poll.ts");

test("late webhook confirmation is read without repeating capture or purchase", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        paymentStatus: calls.length < 3 ? "PENDING" : "COMPLETED",
        amount: 239,
      }),
    };
  };
  try {
    const result = await pollPaymentStatus("PPLS/test", new AbortController().signal, 12, 0);
    assert.equal(result.paymentStatus, "COMPLETED");
    assert.equal(result.amount, 239);
    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.equal(call.url, "/api/orders/PPLS%2Ftest/status");
      assert.equal(call.options.method, undefined);
      assert.equal(call.options.cache, "no-store");
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("polling is bounded, tolerates transient errors and never invents success", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) {
      throw Error("temporary network failure");
    }
    return { ok: true, json: async () => ({ paymentStatus: "PENDING" }) };
  };
  try {
    assert.equal(await pollPaymentStatus("own", new AbortController().signal, 3, 0), null);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test("leaving the page aborts polling without updating a completed response", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    controller.abort();
    return { ok: true, json: async () => ({ paymentStatus: "COMPLETED" }) };
  };
  try {
    assert.equal(await pollPaymentStatus("own", controller.signal, 12, 0), null);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("authorization errors stop polling and terminal failure is preserved", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { status: 403, ok: false };
  };
  try {
    assert.equal(await pollPaymentStatus("other", new AbortController().signal, 12, 0), null);
    assert.equal(calls, 1);
    for (const paymentStatus of ["FAILED", "CANCELLED"]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ paymentStatus }) });
      assert.equal(
        (await pollPaymentStatus("own", new AbortController().signal, 12, 0)).paymentStatus,
        paymentStatus
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
