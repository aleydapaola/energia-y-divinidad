import assert from "node:assert/strict";
import test from "node:test";

import { digitalCartPaymentMethods } from "../lib/digital-products/prices.ts";

test("a digital cart offers only the methods supported by every product", () => {
  assert.deepEqual(digitalCartPaymentMethods([{ price: 10 }, { priceUSD: 10 }]), []);
  assert.deepEqual(digitalCartPaymentMethods([{ price: 10, priceUSD: 2 }, { priceUSD: 1 }]), [
    "paypal_direct",
  ]);
  assert.deepEqual(digitalCartPaymentMethods([{ price: 10 }, { price: 20, priceUSD: 2 }]), [
    "breb_manual",
  ]);
  assert.deepEqual(digitalCartPaymentMethods([{ price: 10 }, { price: 0 }]), []);
  assert.deepEqual(digitalCartPaymentMethods([]), []);
});
