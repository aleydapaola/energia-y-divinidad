/* eslint-disable require-await -- Synthetic asynchronous route and database adapters. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership as load } from "./helpers/membership-loader.mjs";

const content = load("lib/campaign-content.ts");
const groupRecipients = Array.from({ length: 30 }, (_, i) => ({
  id: `user-${i.toString().padStart(2, "0")}`,
  email: `person-${i.toString().padStart(2, "0")}@example.test`,
  name: null,
}));

test("combined audience deduplicates and refuses confirmation when a hidden address changes", async () => {
  let writes = 0;
  const users = structuredClone(groupRecipients);
  const prisma = {
    user: { findMany: async ({ where }) => users.filter(({ id }) => where.id.in.includes(id)) },
    entitlement: {
      findMany: async () => users.map((user) => ({ user })),
    },
    emailCampaign: {
      create: async (request) => {
        writes++;
        return request.data;
      },
    },
  };
  const audience = load("lib/email-audiences.ts", {
    "next-sanity": { groq: (parts) => parts.join("") },
    "@/lib/email-recipients": { parseManualEmails: () => [] },
    "@/lib/prisma": { prisma },
    "@/sanity/lib/client": { client: { fetch: async () => [] } },
  });
  const campaigns = load("lib/services/email-campaigns.ts", {
    "@/lib/campaign-content": content,
    "@/lib/email": { sendEmailWithLogging: () => assert.fail("No test email expected") },
    "@/lib/email-audiences": audience,
    "@/lib/prisma": { prisma },
  });
  const selectedUsers = { audienceType: "SELECTED_USERS", userIds: users.map(({ id }) => id) };
  const first = await campaigns.previewCampaignAudience(selectedUsers);
  users[29].email = "person-replaced@example.test";
  const changed = await campaigns.previewCampaignAudience(selectedUsers);
  assert.equal(first.count, changed.count);
  assert.deepEqual(first.recipients, changed.recipients);
  const campaign = {
    title: "Test",
    subject: "Test",
    body: "Test",
    createdById: "admin",
    createdByEmail: "admin@example.test",
  };
  await assert.rejects(
    campaigns.createEmailCampaign({
      ...campaign,
      ...selectedUsers,
      audienceFingerprint: first.fingerprint,
    }),
    campaigns.CampaignAudienceChanged
  );
  assert.equal(writes, 0);

  const groups = {
    audienceType: "COMBINED",
    groups: [{ type: "COURSE", id: "course" }],
    userIds: [users[0].id],
  };
  assert.equal((await audience.resolveEmailAudience(groups)).length, 30);
  const confirmed = await campaigns.createEmailCampaign({
    ...campaign,
    ...selectedUsers,
    audienceFingerprint: changed.fingerprint,
  });
  assert.equal(confirmed.recipients.createMany.data.length, 30);
  assert.ok(confirmed.recipients.createMany.data.some(({ email }) => email === users[29].email));
});

test("preview and delivery template renders labels and alt text safely", () => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "synthetic";
  process.env.NEXT_PUBLIC_SANITY_DATASET = "preview";
  const campaigns = load("lib/services/email-campaigns.ts", {
    "@/lib/campaign-content": content,
    "@/lib/email": {},
    "@/lib/email-audiences": {},
    "@/lib/prisma": {},
  });
  const message = content.campaignMessage.parse({
    subject: "Mensaje <nuevo>",
    body: "Texto antiguo https://example.test/view",
    blocks: [
      { type: "link", label: "<enlace>", url: "https://example.test/?a=1&b=2" },
      {
        type: "image",
        alt: 'Texto "alternativo"',
        url: "https://cdn.sanity.io/images/synthetic/preview/example.png",
      },
    ],
  });
  const html = campaigns.renderCampaignHtml(message);
  assert.match(html, /https:\/\/example.test\/view/);
  assert.match(html, /&lt;enlace&gt;/);
  assert.match(html, /a=1&amp;b=2/);
  assert.match(html, /alt="Texto &quot;alternativo&quot;"/);
  assert.equal(
    content.campaignMessage.safeParse({
      ...message,
      blocks: [{ type: "link", label: "Acción", url: "javascript:alert(1)" }],
    }).success,
    false
  );
  assert.equal(
    content.campaignMessage.safeParse({
      ...message,
      blocks: [
        {
          type: "image",
          alt: "",
          url: "https://cdn.sanity.io/images/synthetic/production/private.png",
        },
      ],
    }).success,
    false
  );
});

test("draft updates preserve draft status and reject a stale edit or a queued campaign", async () => {
  const editedAt = new Date("2026-11-28T12:00:00Z");
  let row = {
    id: "draft",
    status: "DRAFT",
    updatedAt: editedAt,
    title: "Title",
    subject: "Subject",
    body: "",
    contentBlocks: null,
  };
  let admin = false;
  const drafts = load("app/api/admin/communications/drafts/[id]/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/admin-auth": {
      requireAdminSession: async () => (admin ? { user: { id: "admin" } } : null),
    },
    "@/lib/campaign-content": content,
    "@/lib/prisma": {
      prisma: {
        emailCampaign: {
          findFirst: async ({ where }) =>
            row.id === where.id && row.status === where.status ? row : null,
          updateManyAndReturn: async ({ where, data }) => {
            if (row.status !== where.status || +row.updatedAt !== +where.updatedAt) {
              return [];
            }
            row = { ...row, ...data, updatedAt: new Date(+editedAt + 1) };
            return [{ id: row.id, updatedAt: row.updatedAt }];
          },
        },
      },
    },
  });
  const request = () =>
    new Request("https://example.test/draft", {
      method: "PATCH",
      body: JSON.stringify({
        title: "New title",
        subject: "Subject",
        body: "Draft",
        updatedAt: editedAt.toISOString(),
      }),
    });
  const context = { params: Promise.resolve({ id: "draft" }) };
  assert.equal((await drafts.PATCH(request(), context)).status, 403);
  admin = true;
  assert.equal((await drafts.PATCH(request(), context)).status, 200);
  assert.equal((await (await drafts.GET(request(), context)).json()).body, "Draft");
  assert.equal((await drafts.PATCH(request(), context)).status, 409);
  row.status = "QUEUED";
  assert.equal((await drafts.GET(request(), context)).status, 404);
});
