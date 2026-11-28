/* eslint-disable require-await -- Isolated asynchronous adapters for Mailchimp, Resend and Prisma. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { loadMembership as load } from "./helpers/membership-loader.mjs";

const config = {
  mailchimpConfigured: true,
  listUrl: "https://us1.api.mailchimp.com/3.0/lists/synthetic-list",
  listId: "synthetic-list",
  apiKey: "synthetic-secret",
};
const footer = {
  unsubscribeUrl: "https://example.list-manage.com/unsubscribe?u=test&id=synthetic-list",
  postalAddress: "Ejemplo <dirección>",
};
const recipient = { email: "person@example.test", userId: "user" };

test("dispatch checks the current newsletter subscription and operational opt-out", async (t) => {
  let optedOut = false;
  let state = "subscribed";
  let calls = 0;
  const consent = load("lib/services/campaign-consent.ts", {
    "@/lib/newsletter-gift": { readNewsletterList: async () => footer },
    "@/lib/newsletter-gift-config": { newsletterGiftConfiguration: () => config },
    "@/lib/prisma": {
      prisma: { user: { findFirst: async () => (optedOut ? { id: "user" } : null) } },
    },
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.equal(options.method, undefined);
    const id = createHash("md5").update(recipient.email).digest("hex");
    assert.ok(url.startsWith(`${config.listUrl}/members/${id}?`));
    if (state === "timeout") {
      throw new Error("Simulated timeout");
    }
    if (state === "absent") {
      return Response.json({}, { status: 404 });
    }
    return Response.json({
      id,
      list_id: state === "wrong-list" ? "wrong-list" : config.listId,
      email_address: recipient.email,
      status: state,
    });
  });

  assert.deepEqual(await consent.campaignNewsletterSettings(), { config, footer });
  assert.equal((await consent.campaignRecipientEligibility(recipient, config)).action, "send");
  for (const status of ["unsubscribed", "pending", "cleaned", "absent"]) {
    state = status;
    assert.equal((await consent.campaignRecipientEligibility(recipient, config)).action, "skip");
  }
  for (const status of ["timeout", "wrong-list"]) {
    state = status;
    assert.equal((await consent.campaignRecipientEligibility(recipient, config)).action, "defer");
  }
  const newsletterCalls = calls;
  assert.equal((await consent.campaignRecipientEligibility(recipient)).action, "send");
  optedOut = true;
  assert.equal((await consent.campaignRecipientEligibility(recipient)).action, "skip");
  assert.equal((await consent.campaignRecipientEligibility(recipient, config)).action, "skip");
  assert.equal(calls, newsletterCalls);
});

test("the batch sends only eligible recipients and preserves deferred rows", async () => {
  const recipients = ["skip", "defer", "send"].map((id) => ({
    id,
    userId: id,
    email: `${id}@example.test`,
    name: null,
  }));
  const updates = [];
  const sends = [];
  const campaign = {
    id: "campaign",
    kind: "NEWSLETTER",
    audienceType: "COMBINED",
    audienceId: null,
    subject: "Newsletter",
    body: "Hola",
    contentBlocks: null,
    recipients,
  };
  const prisma = {
    emailCampaign: {
      findFirst: async () => campaign,
      update: async ({ data }) => {
        assert.equal(data.status, "SENDING");
      },
    },
    emailCampaignRecipient: {
      update: async (update) => {
        updates.push(update);
      },
      updateMany: async (update) => {
        updates.push(update);
      },
      count: async ({ where }) => (where.status === "QUEUED" ? 1 : 0),
    },
  };
  const campaigns = load("lib/services/email-campaigns.ts", {
    "@/lib/campaign-content": load("lib/campaign-content.ts"),
    "@/lib/email": {
      sendEmailWithLogging: async (message) => {
        sends.push(message);
        return { success: true, messageId: "synthetic-resend-id" };
      },
    },
    "@/lib/email-audiences": {},
    "@/lib/prisma": { prisma },
    "@/lib/services/campaign-consent": {
      campaignNewsletterSettings: async () => ({ config, footer }),
      campaignRecipientEligibility: async ({ id }, currentConfig) => {
        assert.equal(currentConfig, config);
        return { action: id, reason: "Synthetic check" };
      },
    },
  });
  const result = await campaigns.processEmailCampaignBatch();
  assert.equal(result.successful, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.deferred, 1);
  assert.deepEqual(
    sends.map(({ to }) => to),
    ["send@example.test"]
  );
  assert.match(sends[0].html, /Darme de baja/);
  assert.match(sends[0].html, /\?u=test&amp;id=synthetic-list/);
  assert.match(sends[0].html, /Ejemplo &lt;dirección&gt;/);
  assert.equal(updates[0].data.status, "SKIPPED");
  assert.equal(updates[1].data.status, "QUEUED");
  assert.ok(updates[1].data.nextAttemptAt > new Date());
  assert.equal(updates[2].data.providerMessageId, "synthetic-resend-id");
});
