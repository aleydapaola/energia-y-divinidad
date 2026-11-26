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

test("digital cart persistence deduplicates and leaves the Academy cart untouched", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map([["academia-cart", "preserved"]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const { useDigitalCartStore } = await import("../lib/stores/digital-cart-store.ts");
    const first = { id: "first", slug: "first", title: "Primero", priceUSD: 2, driveDelivery: false };
    const second = { ...first, id: "second", slug: "second", title: "Segundo" };
    useDigitalCartStore.getState().addItem(first);
    useDigitalCartStore.getState().addItem(first);
    useDigitalCartStore.getState().addItem(second);
    assert.deepEqual(useDigitalCartStore.getState().items, [first, second]);
    useDigitalCartStore.getState().removeItem(first.id);
    assert.deepEqual(JSON.parse(values.get("digital-products-cart")).state.items, [second]);
    await useDigitalCartStore.persist.rehydrate();
    assert.deepEqual(useDigitalCartStore.getState().items, [second]);
    assert.equal(values.get("academia-cart"), "preserved");
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, "localStorage", previous);
    } else {
      delete globalThis.localStorage;
    }
  }
});
