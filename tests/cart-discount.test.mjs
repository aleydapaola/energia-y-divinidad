import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(file, deps) {
  const filename = new URL("../" + file, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (Object.hasOwn(deps, name)) {
      return deps[name];
    }
    if (name.startsWith("@/")) {
      throw new Error("Unexpected dependency: " + name);
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}

function nodes(node) {
  if (Array.isArray(node)) {
    return node.flatMap(nodes);
  }
  if (!node?.props) {
    return [];
  }
  return [node, ...nodes(node.props.children)];
}

// Exercise the actual input handler, API and validator together. No external services.
function setup({ currency = "USD", codeOverrides = {} } = {}) {
  const courseId = "qa-course";
  const discountCode = {
    _id: "qa-discount",
    code: "ORION",
    active: true,
    discountType: "percentage",
    discountValue: 25,
    usageType: "multi_use",
    appliesToCourses: [{ _id: courseId, title: "QA course" }],
    ...codeOverrides,
  };
  const library = load("lib/discount-codes.ts", {
    "@/lib/prisma": {
      prisma: {
        discountUsage: {
          count: async () => {
            throw new Error("Unexpected usage lookup");
          },
        },
      },
    },
    "@/sanity/lib/client": {
      client: {
        fetch: async (_query, params) => {
          assert.equal(params.code, "ORION");
          return discountCode;
        },
      },
    },
    "@/sanity/lib/queries": { DISCOUNT_CODE_BY_CODE_QUERY: "mock-query" },
  });
  const { POST } = load("app/api/discount-codes/validate/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/auth": { auth: async () => null },
    "@/lib/discount-codes": library,
  });
  let applied = null;
  const state = [" orion ", false, null];
  const store = {
    items: [{ id: courseId }],
    applyDiscount: (value) => {
      applied = value;
    },
    removeDiscount: () => {
      applied = null;
    },
  };
  let index = 0;
  const { DiscountCodeInput } = load("components/cart/DiscountCodeInput.tsx", {
    react: {
      useState: () => {
        const i = index++;
        return [
          state[i],
          (value) => {
            state[i] = value;
          },
        ];
      },
    },
    "@/lib/stores/cart-store": {
      useCartStore: (selector) => selector(store),
      useCartSummary: () => ({ discount: applied, subtotal: 40, currency }),
    },
  });
  return {
    POST,
    get applied() {
      return applied;
    },
    get error() {
      return state[2];
    },
    render() {
      index = 0;
      return DiscountCodeInput();
    },
  };
}

test("cart discount reaches the validator and retains the returned code for checkout in USD and COP", async () => {
  const savedFetch = globalThis.fetch;
  try {
    for (const currency of ["USD", "COP"]) {
      for (const [codeOverrides, amount] of [
        [{}, 10],
        [{ discountType: "fixed_amount", discountValue: 5, currency }, 5],
        [{ discountValue: 100 }, 40],
      ]) {
        const app = setup({ currency, codeOverrides });
        globalThis.fetch = async (url, options) => {
          assert.equal(url, "/api/discount-codes/validate");
          assert.deepEqual(JSON.parse(options.body), {
            code: "ORION",
            productType: "course",
            courseIds: ["qa-course"],
            amount: 40,
            currency,
          });
          return app.POST(new Request("https://preview.test" + url, options));
        };
        await nodes(app.render())
          .find((n) => n.type === "button")
          .props.onClick();
        assert.equal(app.error, null);
        assert.equal(app.applied.code, "ORION");
        assert.equal(app.applied.discountCodeId, "qa-discount");
        assert.equal(app.applied.discountAmount, amount);
        const { renderToStaticMarkup } = require("react-dom/server");
        assert.match(renderToStaticMarkup(app.render()), /ORION/);
      }
    }
  } finally {
    globalThis.fetch = savedFetch;
  }
});

test("cart displays validation failures without applying an invalid discount", async () => {
  const savedFetch = globalThis.fetch;
  try {
    for (const [codeOverrides, error] of [
      [{ active: false }, /desactivado/],
      [{ validUntil: "2000-01-01T00:00:00Z" }, /expirado/],
      [{ appliesToCourses: [{ _id: "another-course" }] }, /no aplica/],
      [{ discountType: "fixed_amount", currency: "COP" }, /COP/],
    ]) {
      const app = setup({ codeOverrides });
      globalThis.fetch = async (url, options) =>
        app.POST(new Request("https://preview.test" + url, options));
      await nodes(app.render())
        .find((n) => n.type === "button")
        .props.onClick();
      assert.equal(app.applied, null);
      assert.match(app.error, error);
    }
  } finally {
    globalThis.fetch = savedFetch;
  }
});

test("checkout uses the validated cart currency for item price, discount, total and payment button", () => {
  const { renderToStaticMarkup } = require("react-dom/server");
  const { formatPrice } = load("lib/stores/cart-store.ts", {});
  for (const [currency, method, discountAmount, total] of [
    ["COP", null, 13000, 117000],
    ["USD", null, 4, 36],
    ["COP", "breb_manual", 13000, 117000],
    ["USD", "paypal_direct", 4, 36],
    ["COP", null, 130000, 0],
    ["USD", null, 40, 0],
  ]) {
    const states = [null, method, false, null, true];
    let index = 0;
    const subtotal = currency === "COP" ? 130000 : 40;
    const store = { items: [{ id: "qa-course", title: "QA course", price: 130000, priceUSD: 40 }] };
    const { AcademiaCheckoutClient } = load("app/academia/checkout/AcademiaCheckoutClient.tsx", {
      react: { useState: () => [states[index++], () => {}], useEffect: () => {} },
      "next/navigation": { useRouter: () => ({ push: () => {} }) },
      "next-auth/react": { useSession: () => ({ data: null, status: "unauthenticated" }) },
      "next/image": { default: () => null },
      "next/link": { default: () => null },
      "@/components/cart": { DiscountCodeInput: () => null },
      "@/components/checkout/CheckoutHeader": { CheckoutHeader: () => null },
      "@/components/checkout/PurchasePolicy": { PurchasePolicy: () => null },
      "@/lib/purchase-methods": { purchaseMethods: () => [] },
      "@/sanity/lib/image": {},
      "@/lib/stores/cart-store": {
        useCartStore: (selector) => selector(store),
        useCartSummary: () => ({
          discountAmount,
          currency,
          isEmpty: false,
          isFree: total === 0,
          discount: { code: "QA-DISCOUNT" },
        }),
        formatPrice,
      },
    });
    const tree = AcademiaCheckoutClient();
    const itemPrice = nodes(tree).find(
      (n) => n.type === "p" && n.props.className?.includes("mt-1")
    );
    assert.equal(itemPrice.props.children, formatPrice(subtotal, currency));
    const html = renderToStaticMarkup(tree);
    assert.ok(html.includes("-" + formatPrice(discountAmount, currency)));
    const button = nodes(tree).find(
      (n) => n.type === "button" && n.props.onClick?.name === "handleCheckout"
    );
    assert.equal(
      button.props.children,
      total === 0 ? "Obtener Gratis" : "Pagar " + formatPrice(total, currency)
    );
    assert.equal(button.props.disabled, total !== 0 && method === null);
  }
});
