/* eslint-disable require-await -- Isolated adapters, no database or email-provider calls. */
/* eslint-disable no-console -- Capture and restore log methods to verify delivery diagnostics. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

test("password recovery logs delivery outcomes truthfully while keeping account existence private", async () => {
  const original = { info: console.info, error: console.error, log: console.log };
  try {
    const replies = [];
    for (const outcome of ["missing", "accepted", "failed"]) {
      const logs = [];
      console.info = (...args) => logs.push(["info", ...args]);
      console.error = (...args) => logs.push(["error", ...args]);
      console.log = () => {};
      let sends = 0;
      const { POST } = loadMembership("app/api/auth/forgot-password/route.ts", {
        "@/lib/prisma": {
          prisma: {
            user: {
              findUnique: async () =>
                outcome === "missing" ? null : { id: "qa-user", name: "QA" },
            },
            verificationToken: { deleteMany: async () => {}, create: async () => {} },
          },
        },
        "@/lib/email": {
          sendPasswordResetEmail: async () => {
            sends++;
            return outcome === "accepted"
              ? { success: true, data: { id: "synthetic-message" } }
              : { success: false };
          },
        },
      });
      const response = await POST(
        new Request("https://preview.energiaydivinidad.com/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: "qa@example.test" }),
        })
      );
      assert.equal(response.status, 200);
      replies.push(await response.json());
      assert.equal(sends, outcome === "missing" ? 0 : 1);
      if (outcome === "accepted") {
        assert.deepEqual(logs, [
          ["info", "[FORGOT-PASSWORD] Recovery email accepted by delivery service"],
        ]);
      } else if (outcome === "failed") {
        assert.deepEqual(logs, [["error", "[FORGOT-PASSWORD] Recovery email delivery failed"]]);
      } else {
        assert.equal(logs.length, 0);
      }
      assert.doesNotMatch(JSON.stringify(logs), /qa@example|token|enviado/);
    }
    assert.deepEqual(replies[0], replies[1]);
    assert.deepEqual(replies[1], replies[2]);
  } finally {
    Object.assign(console, original);
  }
});
