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
  expectedAmount: 80000,
  currency: "COP",
};
test("manual confirmation requires a reference, the received amount and verification, with explicit simulation wording only in Preview", async () => {
  const saved = globalThis.fetch;
  try {
    for (const simulation of [true, false]) {
      let refreshed = 0,
        submitted;
      const { ConfirmPaymentButton } = load(
        [false, true, " PRUEBA-NO-REAL-1 ", "80000", "", true, "test", null],
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
        receivedAmount: 80000,
        verifiedInAccount: true,
        notes: "test",
      });
      assert.equal(refreshed, 1);
    }
    for (const [reference, received, verified] of [
      ["", "80000", true],
      ["OK-123", "", true],
      ["OK-123", "80000", false],
    ]) {
      const { ConfirmPaymentButton } = load(
        [false, true, reference, received, "", verified, "", null],
        () => {}
      );
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
test("a received amount that differs from the order blocks confirmation until a reason is recorded", async () => {
  const saved = globalThis.fetch;
  try {
    for (const [received, reason, expectedDisabled] of [
      ["70000", "", true],
      ["70000", "  ", true],
      ["70000", "Ingreso parcial acordado", false],
      ["80000", "", false],
    ]) {
      let submitted;
      const { ConfirmPaymentButton } = load(
        [false, true, "OK-123", received, reason, true, "", null],
        () => {}
      );
      const tree = ConfirmPaymentButton({ ...props, simulation: false });
      const button = nodes(tree).find(
        (n) => n.type === "button" && n.props.onClick?.name === "handleConfirm"
      );
      assert.equal(button.props.disabled, expectedDisabled, `received=${received}`);
      if (!expectedDisabled) {
        globalThis.fetch = async (url, options) => {
          submitted = JSON.parse(options.body);
          return { ok: true, json: async () => ({ success: true }) };
        };
        await button.props.onClick();
        assert.equal(submitted.receivedAmount, Number(received));
        assert.equal(
          submitted.amountDiscrepancyReason,
          reason.trim() ? reason.trim() : undefined,
          `reason for ${received}`
        );
      }
    }
  } finally {
    globalThis.fetch = saved;
  }
});
