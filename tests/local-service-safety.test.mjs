import assert from "node:assert/strict";
import { test } from "node:test";

import { studioEnvironment } from "../lib/sanity/studio-environment.ts";
import { assertLocalServiceSafety } from "../scripts/local-service-safety.mjs";

const safe = {
  NEXT_PUBLIC_SANITY_PROJECT_ID: "81jpalr2",
  NEXT_PUBLIC_SANITY_DATASET: "preview",
  PREVIEW_SANITY_DATASET: "preview",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};
test("local configuration accepts only isolated contents and local URLs", () => {
  assert.doesNotThrow(() => assertLocalServiceSafety(safe));
  for (const change of [
    { NEXT_PUBLIC_SANITY_DATASET: "production" },
    { NEXT_PUBLIC_SANITY_PROJECT_ID: "other-project" },
    { NEXTAUTH_URL: "https://energiaydivinidad.com" },
    { NEXT_PUBLIC_SITE_URL: "https://example.com" },
    { PREVIEW_SANITY_DATASET: "production" },
  ]) {
    assert.throws(() => assertLocalServiceSafety({ ...safe, ...change }));
  }
});
test("inherited external secrets cannot silently activate services locally", () => {
  for (const key of [
    "RESEND_API_KEY",
    "SANITY_API_TOKEN",
    "MAILCHIMP_API_KEY",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "PAYPAL_CLIENT_SECRET",
    "WOMPI_PRIVATE_KEY",
  ]) {
    assert.throws(
      () => assertLocalServiceSafety({ ...safe, [key]: "test-secret" }),
      new RegExp(key)
    );
  }
});
test("Studio defaults to a clearly labeled test dataset and blocks a mismatched Preview", () => {
  assert.equal(studioEnvironment({}).dataset, "preview");
  assert.match(studioEnvironment({}).title, /PRUEBAS — NO REAL/);
  assert.throws(() =>
    studioEnvironment({
      dataset: "production",
      appUrl: "https://energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app",
    })
  );
  assert.match(
    studioEnvironment({ dataset: "production", appUrl: "https://energiaydivinidad.com" }).title,
    /CONTENIDO REAL/
  );
});
