import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const rules = loadMembership("lib/newsletter-capture-rules.ts");

// Component lifecycle with an isolated clock, storage and DOM. No browser,
// providers or requests; viewport geometry does not certify visual layout.
function invitationScenario({ width = 375, height = 667 } = {}, run) {
  const names = ["window", "document", "sessionStorage", "localStorage", "clearInterval"];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const originalNow = Date.now;
  const session = new Map([[rules.CAPTURE_EXPERIMENT, "invitation"]]);
  const preferences = new Map();
  const listeners = new Map();
  const events = [];
  let now = 100000;
  let open = false;
  let dialog = false;
  let editing = false;
  let formVisible = false;
  let interval;
  let effect;
  let mounted = false;
  let cleanup;
  const storage = (values) => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  });
  Date.now = () => now;
  globalThis.sessionStorage = storage(session);
  globalThis.localStorage = storage(preferences);
  globalThis.clearInterval = () => {
    interval = undefined;
  };
  globalThis.window = {
    innerWidth: width,
    innerHeight: height,
    scrollY: 350,
    setInterval: (callback) => {
      interval = callback;
      return 1;
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };
  globalThis.document = {
    visibilityState: "visible",
    activeElement: { matches: () => editing },
    documentElement: { scrollHeight: height + 1000 },
    querySelector: () => (dialog ? {} : null),
    querySelectorAll: () => [
      {
        getBoundingClientRect: () => ({
          top: formVisible ? height - 100 : height + 100,
          bottom: height + 300,
        }),
      },
    ],
  };
  try {
    const { NewsletterInvitation } = loadMembership(
      "components/newsletter/NewsletterInvitation.tsx",
      {
        react: {
          useState: () => [
            open,
            (value) => {
              open = value;
            },
          ],
          useEffect: (callback) => {
            if (!mounted) {
              effect = callback;
            }
          },
        },
        "lucide-react": { X: "span" },
        "next/link": { default: "a" },
        "next/navigation": { usePathname: () => "/" },
        "next-auth/react": { useSession: () => ({ status: "unauthenticated" }) },
        "@/lib/newsletter-capture-client": {
          captureMetric: (source, event) => events.push({ source, event }),
        },
        "@/lib/newsletter-capture-rules": rules,
        "@/lib/stores/cart-store": { useCartStore: (select) => select({ isOpen: false }) },
      }
    );
    const mount = () => {
      NewsletterInvitation();
      mounted = true;
      cleanup = effect();
    };
    mount();
    run({
      tick: (elapsed = 0) => {
        now += elapsed;
        interval?.();
      },
      tree: () => NewsletterInvitation(),
      dialog: (value) => {
        dialog = value;
      },
      formVisible: (value) => {
        formVisible = value;
      },
      editing: (value) => {
        editing = value;
      },
      scroll: (value) => {
        window.scrollY = value * 1000;
      },
      request: () => listeners.get("eyd-newsletter-requested")?.(),
      newTab: () => {
        cleanup();
        mounted = false;
        open = false;
        session.clear();
        session.set(rules.CAPTURE_EXPERIMENT, "invitation");
        mount();
      },
      events,
      preferences,
      now: () => now,
    });
  } finally {
    cleanup?.();
    Date.now = originalNow;
    for (const [name, descriptor] of saved) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  }
}

test("375px invitation needs both engagement thresholds and keeps focus unchanged", () => {
  invitationScenario({}, (ui) => {
    const focused = document.activeElement;
    ui.tick(14999);
    assert.equal(ui.tree(), null);
    ui.scroll(0.34);
    ui.tick(1);
    assert.equal(ui.tree(), null);
    ui.scroll(0.35);
    ui.tick();
    assert.equal(ui.tree().type, "aside");
    assert.equal(document.activeElement, focused);
  });
});

test("375px dialog prevents opening, then a later dialog hides the invitation without reopening", () => {
  invitationScenario({}, (ui) => {
    ui.dialog(true);
    ui.tick(15000);
    assert.equal(ui.tree(), null);
    ui.dialog(false);
    ui.tick();
    assert.equal(ui.tree().type, "aside");
    ui.dialog(true);
    ui.tick();
    assert.equal(ui.tree(), null);
    ui.dialog(false);
    ui.tick(60000);
    assert.equal(ui.tree(), null);
    assert.equal(ui.events.filter(({ event }) => event === "invitation").length, 1);
  });
});

test("375px typing hides a visible invitation and does not repeat it in the tab", () => {
  invitationScenario({}, (ui) => {
    ui.tick(15000);
    assert.equal(ui.tree().type, "aside");
    ui.editing(true);
    ui.tick();
    assert.equal(ui.tree(), null);
    ui.editing(false);
    ui.tick(60000);
    assert.equal(ui.tree(), null);
  });
});

test("375px close preserves the 14-day preference across a new tab", () => {
  invitationScenario({}, (ui) => {
    ui.tick(15000);
    const button = ui.tree().props.children.find((child) => child?.type === "button");
    assert.equal(button.props["aria-label"], "Cerrar invitación a la meditación");
    button.props.onClick();
    assert.equal(ui.tree(), null);
    assert.equal(
      Number(ui.preferences.get("eyd-newsletter-dismissed-until")),
      ui.now() + rules.INVITATION_DISMISS_MS
    );
    ui.newTab();
    ui.tick(15000);
    assert.equal(ui.tree(), null);
    ui.tick(rules.INVITATION_DISMISS_MS);
    assert.equal(ui.tree().type, "aside");
  });
});

test("375px a newsletter request hides the invitation for the rest of the tab", () => {
  invitationScenario({}, (ui) => {
    ui.tick(15000);
    assert.equal(ui.tree().type, "aside");
    ui.request();
    assert.equal(ui.tree(), null);
    ui.tick(60000);
    assert.equal(ui.tree(), null);
  });
});

test("desktop also hides an invitation when a dialog opens later", () => {
  invitationScenario({ width: 1440, height: 900 }, (ui) => {
    ui.tick(15000);
    assert.equal(ui.tree().type, "aside");
    ui.dialog(true);
    ui.tick();
    assert.equal(ui.tree(), null);
  });
});

test("375px a visible signup form prevents the invitation and hides one shown before scrolling to it", () => {
  invitationScenario({ height: 500 }, (ui) => {
    ui.formVisible(true);
    ui.tick(15000);
    assert.equal(ui.tree(), null);
    ui.formVisible(false);
    ui.tick();
    assert.equal(ui.tree().type, "aside");
    ui.formVisible(true);
    ui.tick();
    assert.equal(ui.tree(), null);
    ui.formVisible(false);
    ui.tick(60000);
    assert.equal(ui.tree(), null);
    assert.equal(ui.events.filter(({ event }) => event === "invitation").length, 1);
  });
});
