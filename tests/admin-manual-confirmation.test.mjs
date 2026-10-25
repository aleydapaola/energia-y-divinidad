import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");
function load(values, refresh) {
  const filename = new URL("../app/admin/orders/[id]/ConfirmPaymentButton.tsx", import.meta.url)
    .pathname;
  let index = 0;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === "react") {
      return { useState: () => [values[index++], () => {}] };
    }
    if (name === "next/navigation") {
      return { useRouter: () => ({ refresh }) };
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
  if (!node || !node.props) {
    return [];
  }
  return [node, ...nodes(node.props.children)];
}
const props = {
  orderId: "qa-order",
  orderNumber: "BREB-QA-NO-REAL",
  paymentMethod: "BREB_MANUAL",
  paymentStatus: "PENDING",
};
test("manual confirmation requires both a reference and verification, with explicit simulation wording only in Preview", async () => {
  const saved = globalThis.fetch;
  try {
    for (const simulation of [true, false]) {
      let refreshed = 0,
        submitted;
      const { ConfirmPaymentButton } = load(
        [false, true, " PRUEBA-NO-REAL-1 ", true, "test", null],
        () => {
          refreshed++;
        }
      );
      const tree = ConfirmPaymentButton({ ...props, simulation });
      const html = renderToStaticMarkup(tree);
      assert.equal(html.includes("No se recibe ni se mueve dinero"), simulation);
      assert.equal(html.includes("No se ha recibido dinero real"), simulation);
      assert.equal(html.includes("cuenta receptora"), !simulation);
      const button = nodes(tree).find(
        (n) => n.type === "button" && n.props.onClick?.name === "handleConfirm"
      );
      assert.equal(button.props.disabled, false);
      globalThis.fetch = async (url, options) => {
        assert.equal(url, "/api/admin/orders/qa-order/confirm-payment");
        submitted = JSON.parse(options.body);
        return { ok: true, json: async () => ({ success: true }) };
      };
      await button.props.onClick();
      assert.deepEqual(submitted, {
        transactionReference: "PRUEBA-NO-REAL-1",
        verifiedInAccount: true,
        notes: "test",
      });
      assert.equal(refreshed, 1);
    }
    for (const [reference, verified] of [
      ["", true],
      ["OK-123", false],
    ]) {
      const { ConfirmPaymentButton } = load([false, true, reference, verified, "", null], () => {});
      const tree = ConfirmPaymentButton({ ...props, simulation: true });
      const button = nodes(tree).find(
        (n) => n.type === "button" && n.props.onClick?.name === "handleConfirm"
      );
      assert.equal(button.props.disabled, true);
    }
  } finally {
    globalThis.fetch = saved;
  }
});
