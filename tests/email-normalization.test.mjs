import assert from "node:assert/strict";
import { test } from "node:test";

import React from "react";

import { loadMembership } from "./helpers/membership-loader.mjs";

const email = "client@example.invalid";
const password = " MixedCase-password-QA ";

function login({ verified = true, exists = true } = {}) {
  const lookups = [];
  const comparisons = [];
  let config;
  loadMembership("lib/auth.ts", {
    "@auth/prisma-adapter": { PrismaAdapter: () => ({}) },
    bcrypt: {
      default: {
        compare: (candidate) => {
          comparisons.push(candidate);
          return Promise.resolve(candidate === password);
        },
      },
    },
    "next-auth": {
      default: (options) => {
        config = options;
        return {};
      },
    },
    "next-auth/providers/credentials": { default: (options) => options },
    "./auth.config": { authConfig: {} },
    "./prisma": {
      prisma: {
        user: {
          findUnique: ({ where }) => {
            lookups.push(where.email);
            return Promise.resolve(
              exists && where.email === email
                ? {
                    id: "synthetic-client",
                    email,
                    password: "synthetic-hash",
                    emailVerified: verified ? new Date("2026-01-01") : null,
                  }
                : null
            );
          },
        },
      },
    },
  });
  return { authorize: config.providers[0].authorize, lookups, comparisons };
}

test("login accepts mixed-case email and surrounding whitespace without changing the password", async () => {
  const service = login();
  for (const input of [email, "Client@Example.Invalid", "  CLIENT@EXAMPLE.INVALID \t"]) {
    const user = await service.authorize({ email: input, password });
    assert.equal(user?.id, "synthetic-client");
    assert.equal(user.email, email);
  }
  assert.deepEqual(service.lookups, [email, email, email]);
  assert.deepEqual(service.comparisons, [password, password, password]);
});

test("email correction still rejects a wrong password, an unknown account and an unverified account", async () => {
  assert.equal(await login().authorize({ email, password: password.toLowerCase() }), null);
  assert.equal(await login({ exists: false }).authorize({ email, password }), null);
  await assert.rejects(
    login({ verified: false }).authorize({ email: email.toUpperCase(), password }),
    /EMAIL_NOT_VERIFIED/
  );
});

test("malformed or empty login credentials never query the database", async () => {
  const service = login();
  for (const credentials of [
    undefined,
    {},
    { email: "  ", password },
    { email: {}, password },
    { email: [email], password },
    { email, password: {} },
    { email, password: "" },
  ]) {
    assert.equal(await service.authorize(credentials), null);
  }
  assert.deepEqual(service.lookups, []);
});

function nodes(tree) {
  if (Array.isArray(tree)) {
    return tree.flatMap(nodes);
  }
  return tree?.props ? [tree, ...nodes(tree.props.children)] : [];
}

function signInForm() {
  const values = [];
  const requests = [];
  let cursor = 0;
  const { default: Page } = loadMembership("app/auth/signin/page.tsx", {
    react: {
      ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in values)) {
          values[index] = initial;
        }
        return [
          values[index],
          (value) => (values[index] = typeof value === "function" ? value(values[index]) : value),
        ];
      },
    },
    "next/link": { default: "a" },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "next-auth/react": {
      signIn: (_provider, input) => {
        requests.push(input);
        return Promise.resolve({ error: "CredentialsSignin" });
      },
    },
  });
  const Form = nodes(Page()).find((node) => node.type.name === "SignInForm").type;
  const render = () => {
    cursor = 0;
    return Form();
  };
  return { render, requests, find: (predicate) => nodes(render()).find(predicate) };
}

test("email field corrects pasted case and whitespace on blur with mobile autocapitalization off", () => {
  const ui = signInForm();
  const field = () => ui.find((node) => node.props.type === "email");
  assert.equal(field().props.autoCapitalize, "none");
  assert.equal(field().props.autoCorrect, "off");
  field().props.onChange({ target: { name: "email", value: "  Client@Example.Invalid  " } });
  field().props.onBlur({ target: { value: field().props.value } });
  assert.equal(field().props.value, email);
});

test("keyboard submission normalizes email even without blur and preserves password case and spaces", async () => {
  const ui = signInForm();
  ui.find((node) => node.props.name === "email").props.onChange({
    target: { name: "email", value: " Client@Example.Invalid " },
  });
  ui.find((node) => node.props.name === "password").props.onChange({
    target: { name: "password", value: password },
  });
  await ui.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(ui.requests, [{ email, password, redirect: false }]);
});

test("contact normalizes the reply address before passing it to the intercepted mail service", async () => {
  const deliveries = [];
  const { POST } = loadMembership("app/api/contact/route.ts", {
    "@/lib/email": {
      sendContactEmail: (input) => {
        deliveries.push(input);
        return Promise.resolve({ success: true });
      },
    },
  });
  const response = await POST({
    json: () =>
      Promise.resolve({
        name: "Synthetic QA",
        email: " Client@Example.Invalid ",
        subject: "otro",
        message: "Synthetic message; no network or email delivery.",
      }),
  });
  assert.equal(response.status, 200);
  assert.equal(deliveries[0].email, email);
});

test("legacy checkout validation normalizes the guest email", () => {
  const { validateCheckoutRequest } = loadMembership("lib/checkout/validation.ts");
  const result = validateCheckoutRequest({
    productType: "PRODUCT",
    productId: "synthetic-product",
    productName: "Synthetic QA",
    amount: 10,
    currency: "USD",
    paymentMethod: "PAYPAL",
    customerEmail: " Client@Example.Invalid ",
  });
  assert.equal(result.valid, true);
  assert.equal(result.data.customerEmail, email);
});

test("active guest checkout stores a normalized email without contacting payment or mail providers", async () => {
  const orders = [];
  const noEffect = () => assert.fail("Unexpected external effect");
  const { oneTimeCheckout } = loadMembership("lib/checkout/one-time-checkout.ts", {
    "@/lib/auth": { auth: () => Promise.resolve(null) },
    "@/lib/breb": { getBrebConfiguration: () => ({ enabled: true, simulation: true }) },
    "@/lib/checkout/catalog-quote": {
      quoteCatalogItem: () =>
        Promise.resolve({
          productId: "synthetic-product",
          productName: "Synthetic QA",
          orderType: "PRODUCT",
          metadata: {},
        }),
    },
    "@/lib/checkout/discounts": {
      applyCheckoutDiscount: () => Promise.resolve({ finalAmount: 10 }),
    },
    "@/lib/checkout/holds": {
      createHeldCheckoutOrder: (data) => {
        orders.push(data);
        return Promise.resolve({ id: "synthetic-order" });
      },
      releaseUnpaidCheckoutHold: noEffect,
    },
    "@/lib/events/capacity": { assertEventCapacity: noEffect },
    "@/lib/order-access": { allowOrderInBrowser: () => Promise.resolve() },
    "@/lib/payment-processor": { processApprovedPayment: noEffect },
    "@/lib/paypal": { createPayPalOrder: noEffect },
    "@/lib/prisma": { prisma: {} },
    "@/lib/rate-limit": { applyRateLimit: () => null },
    "@/lib/session-scheduling": {},
    "@/lib/utils": {},
  });
  const response = await oneTimeCheckout(
    {
      json: () =>
        Promise.resolve({
          productType: "product",
          productId: "synthetic-product",
          guestEmail: " Client@Example.Invalid ",
        }),
    },
    "breb"
  );
  assert.equal(response.status, 200);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].guestEmail, email);
  assert.equal(orders[0].metadata.customerEmail, email);
});
