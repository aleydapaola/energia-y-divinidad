import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url),
  ts = require("typescript");
function load(path, dependencies) {
  const filename = new URL("../" + path, import.meta.url).pathname,
    mod = new Module(filename);
  mod.require = (name) => {
    if (name in dependencies) {
      return dependencies[name];
    }
    if (name === "next/server") {
      return { NextRequest: Request, NextResponse: { json: Response.json } };
    }
    if (name.startsWith("@/")) {
      throw new Error("Unexpected legacy dependency: " + name);
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
const request = (body) =>
  new Request("https://preview.test/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("retired membership entry points reject both plausible and tampered prices before checkout or provider side effects", async () => {
  for (const file of ["app/api/checkout/paypal/route.ts", "app/api/checkout/route.ts"]) {
    let calls = 0;
    const { POST } = load(file, {
      "@/lib/rate-limit": { applyRateLimit: () => null },
      "@/lib/checkout/one-time-checkout": {
        oneTimeCheckout: async () => {
          calls++;
          throw new Error("must not run");
        },
      },
    });
    for (const productType of ["membership", "MEMBERSHIP"]) {
      for (const amount of [1, 100]) {
        const response = await POST(
          request({
            productType,
            productId: "tier",
            productName: "test",
            amount,
            currency: "USD",
            billingInterval: "yearly",
            paymentMethod: "PAYPAL",
          })
        );
        assert.equal(response.status, 410);
        assert.match((await response.json()).error, /suscripción/);
      }
    }
    assert.equal(calls, 0);
  }
});
test("PayPal one-time purchases still delegate the original server-priced request; compatibility entry normalizes type and method", async () => {
  const calls = [];
  const checkout = {
    oneTimeCheckout: async (req, method) => {
      calls.push({ body: await req.json(), method });
      return Response.json({ success: true });
    },
  };
  const paypal = load("app/api/checkout/paypal/route.ts", {
    "@/lib/checkout/one-time-checkout": checkout,
  });
  const body = {
    productType: "event",
    productId: "event",
    guestEmail: "preview@example.com",
    amount: 20,
  };
  assert.equal((await paypal.POST(request(body))).status, 200);
  assert.deepEqual(calls.pop(), { body, method: "paypal" });
  const generic = load("app/api/checkout/route.ts", {
    "@/lib/checkout/one-time-checkout": checkout,
    "@/lib/rate-limit": { applyRateLimit: () => null },
  });
  for (const paymentMethod of ["PAYPAL", "BANK_TRANSFER"]) {
    assert.equal(
      (
        await generic.POST(
          request({
            productType: "EVENT",
            productId: "event",
            paymentMethod,
            customerEmail: "preview@example.com",
            customerName: "Test",
            amount: 20,
          })
        )
      ).status,
      200
    );
    const call = calls.pop();
    assert.equal(call.body.productType, "event");
    assert.equal(call.body.guestEmail, "preview@example.com");
    assert.equal(call.method, paymentMethod === "PAYPAL" ? "paypal" : "breb");
  }
  assert.equal(
    (
      await generic.POST(
        request({ productType: { toString: "membership" }, paymentMethod: "PAYPAL" })
      )
    ).status,
    400
  );
  assert.equal(
    (await generic.POST(request({ productType: "EVENT", paymentMethod: "NEQUI" }))).status,
    400
  );
  assert.equal(calls.length, 0);
});
test("mobile account navigation selects the current section and routes to the chosen section", () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  let destination;
  const { DashboardNav } = load("components/dashboard/dashboard-nav.tsx", {
    "next/navigation": {
      usePathname: () => "/mi-cuenta/eventos",
      useRouter: () => ({
        push: (path) => {
          destination = path;
        },
      }),
    },
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  });
  const tree = DashboardNav({ hasMembership: false }),
    html = renderToStaticMarkup(tree);
  assert.match(html, /<select/);
  assert.match(html, /<option value="\/mi-cuenta\/eventos" selected="">Mis Eventos/);
  const nodes = (node) =>
    Array.isArray(node)
      ? node.flatMap(nodes)
      : node?.props
        ? [node, ...nodes(node.props.children)]
        : [];
  nodes(tree)
    .find((n) => n.type === "select")
    .props.onChange({ target: { value: "/mi-cuenta/sesiones" } });
  assert.equal(destination, "/mi-cuenta/sesiones");
});
