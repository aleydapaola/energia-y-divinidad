import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const { resolveLegalHolder, LEGAL_HOLDER_PLACEHOLDER } = loadMembership("lib/legal-holder.ts");
const page = {
  title: "Terms",
  content: [{ style: "normal", children: [{ text: LEGAL_HOLDER_PLACEHOLDER, marks: [] }] }],
};

test("legal pages resolve only their environment's configured identity without storing it in CMS content", () => {
  const env = { PREVIEW_LEGAL_HOLDER_NIT: "123456789-0", LEGAL_HOLDER_NIT: "987654321-0" };
  const preview = resolveLegalHolder(page, { ...env, VERCEL_ENV: "preview" });
  const production = resolveLegalHolder(page, { ...env, VERCEL_ENV: "production" });
  assert.match(preview.content[0].children[0].text, /NIT: 123456789-0\./);
  assert.ok(!JSON.stringify(preview).includes(env.LEGAL_HOLDER_NIT));
  assert.match(production.content[0].children[0].text, /NIT: 987654321-0\./);
  assert.ok(!JSON.stringify(production).includes(env.PREVIEW_LEGAL_HOLDER_NIT));
  assert.equal(page.content[0].children[0].text, LEGAL_HOLDER_PLACEHOLDER);
});

test("Production refuses a missing/invalid real identity and never inherits Preview's value", () => {
  for (const LEGAL_HOLDER_NIT of [undefined, "", "not-an-identifier"]) {
    assert.throws(
      () =>
        resolveLegalHolder(page, {
          VERCEL_ENV: "production",
          LEGAL_HOLDER_NIT,
          PREVIEW_LEGAL_HOLDER_NIT: "123456789-0",
        }),
      /identificación fiscal/
    );
  }
});

test("existing CMS pages are preserved and ordinary text is never interpreted as a template", () => {
  assert.equal(resolveLegalHolder(null), null);
  const existing = {
    title: "Existing",
    content: [{ children: [{ text: "Literal {{other}} text" }] }],
  };
  assert.equal(resolveLegalHolder(existing), existing);
  assert.equal(existing.content[0].children[0].text, "Literal {{other}} text");
});
