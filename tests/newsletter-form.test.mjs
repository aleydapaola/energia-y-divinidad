import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const rules = loadMembership("lib/newsletter-capture-rules.ts");
const email = "newsletter-qa@example.invalid";
const context = { source: "blog", variant: "control", device: "mobile" };

function nodes(tree) {
  if (!tree || typeof tree !== "object") {
    return [];
  }
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

function content(tree) {
  if (typeof tree === "string") {
    return tree;
  }
  if (!tree || typeof tree !== "object") {
    return "";
  }
  return [tree?.props?.children].flat(Infinity).map(content).join(" ");
}

// The real component with isolated React state and a fully intercepted fetch.
// No environment, DOM, provider, database, network or browser layout is used.
async function scenario(reply, run) {
  const savedFetch = globalThis.fetch;
  const state = [];
  const requests = [];
  const remembered = [];
  let cursor = 0;
  globalThis.fetch = (url, options) => {
    assert.equal(url, "/api/newsletter");
    requests.push({ url, ...options, body: JSON.parse(options.body) });
    return Promise.resolve().then(reply);
  };
  try {
    const { NewsletterForm } = loadMembership("components/newsletter/NewsletterForm.tsx", {
      react: {
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) {
            state[index] = initial;
          }
          return [state[index], (value) => (state[index] = value)];
        },
        useId: () => "newsletter-form-qa",
        useRef: () => ({ current: null }),
        useEffect() {},
      },
      "lucide-react": { CheckCircle: "span", Loader2: "span" },
      "next/link": { default: "a" },
      "@/lib/newsletter-capture-rules": rules,
      "@/lib/newsletter-capture-client": {
        captureContext: (source) => ({ ...context, source }),
        captureMetric() {
          throw Error("No metrics in component-state QA");
        },
        rememberNewsletterRequest: (subscribed) => remembered.push(subscribed),
      },
    });
    const render = () => {
      cursor = 0;
      return NewsletterForm({ source: "blog" });
    };
    const find = (predicate) => nodes(render()).find(predicate);
    const input = (type) => find((node) => node.type === "input" && node.props.type === type);
    await run({
      render,
      input,
      find,
      requests,
      remembered,
      fill() {
        input("email").props.onChange({ target: { value: email } });
        input("checkbox").props.onChange({ target: { checked: true } });
      },
      submit: () => find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }),
    });
  } finally {
    globalThis.fetch = savedFetch;
  }
}

test("unchecked consent prevents even a direct form submission without a request", async () => {
  await scenario(
    () => assert.fail("Must not submit"),
    async (ui) => {
      assert.equal(ui.input("checkbox").props.checked, false);
      assert.equal(ui.find((node) => node.type === "button").props.disabled, true);
      const field = ui.input("email");
      assert.equal(field.props.type, "email");
      assert.equal(field.props.required, true);
      assert.ok(ui.find((node) => node.type === "label" && node.props.htmlFor === field.props.id));
      const privacy = ui.find((node) => node.type === "a");
      assert.equal(privacy.props.href, "/privacidad");
      assert.equal(privacy.props.target, "_blank");
      await ui.submit();
      assert.match(
        content(ui.find((node) => node.props.role === "alert")),
        /Acepta la suscripción/
      );
      assert.equal(ui.requests.length, 0);
      assert.deepEqual(ui.remembered, []);
    }
  );
});

test("network failure retains the address and consent for a deliberate retry", async () => {
  let online = false;
  await scenario(
    () => {
      if (!online) {
        throw new TypeError("Simulated offline");
      }
      return Response.json({ message: "Confirma tu correo.", subscriptionStatus: "pending" });
    },
    async (ui) => {
      ui.fill();
      await ui.submit();
      assert.match(content(ui.find((node) => node.props.role === "alert")), /No hay conexión/);
      assert.equal(ui.input("email").props.value, email);
      assert.equal(ui.input("checkbox").props.checked, true);
      assert.equal(ui.find((node) => node.type === "button").props.disabled, false);
      assert.deepEqual(ui.remembered, []);
      online = true;
      await ui.submit();
      assert.equal(ui.requests.length, 2);
      assert.deepEqual(ui.remembered, [false]);
    }
  );
});

test("pending response keeps confirmation instructions through rerenders without another request", async () => {
  const message = "Confirma tu correo. Si no aparece, revisa Spam o Promociones.";
  await scenario(
    () => Response.json({ message, subscriptionStatus: "pending" }),
    async (ui) => {
      ui.fill();
      await ui.submit();
      assert.deepEqual(ui.requests[0].body, {
        email,
        acceptedNewsletter: true,
        consentVersion: rules.NEWSLETTER_CONSENT_VERSION,
        ...context,
        website: "",
      });
      for (let count = 0; count < 5; count++) {
        const status = ui.render();
        assert.equal(status.props.role, "status");
        assert.equal(status.props["aria-live"], "polite");
        assert.ok(content(status).includes(message));
        assert.match(content(status), /No necesitas crear una cuenta/);
        assert.equal(
          nodes(status).some((node) => node.type === "form"),
          false
        );
      }
      assert.equal(ui.requests.length, 1);
      assert.deepEqual(ui.remembered, [false]);
    }
  );
});

test("in-flight submission disables controls and ignores another submission after rerender", async () => {
  let resolve;
  const response = new Promise((done) => (resolve = done));
  await scenario(
    () => response,
    async (ui) => {
      ui.fill();
      const pending = ui.submit();
      assert.equal(ui.input("email").props.disabled, true);
      assert.equal(ui.input("checkbox").props.disabled, true);
      assert.equal(ui.find((node) => node.type === "button").props.disabled, true);
      await ui.submit();
      assert.equal(ui.requests.length, 1);
      resolve(Response.json({ message: "Confirma tu correo.", subscriptionStatus: "pending" }));
      await pending;
      assert.deepEqual(ui.remembered, [false]);
    }
  );
});

test("inactive response offers voluntary resubscription without claiming an active subscription", async () => {
  const signupUrl = "https://example.invalid/test-signup";
  await scenario(
    () => Response.json({ error: "Te diste de baja.", signupUrl }, { status: 409 }),
    async (ui) => {
      ui.fill();
      await ui.submit();
      const alert = ui.find((node) => node.props.role === "alert");
      assert.match(content(alert), /Te diste de baja/);
      const link = nodes(alert).find((node) => node.type === "a");
      assert.equal(link.props.href, signupUrl);
      assert.match(content(link), /Volver a suscribirme/);
      assert.equal(ui.input("email").props.value, email);
      assert.equal(ui.requests.length, 1);
      assert.deepEqual(ui.remembered, []);
    }
  );
});
