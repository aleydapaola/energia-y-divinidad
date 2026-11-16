import assert from "node:assert/strict";
import { test } from "node:test";

import { loadMembership } from "./helpers/membership-loader.mjs";

const { homeEmptyPreviewQa } = loadMembership("lib/digital-products/home-preview-qa.ts");
const authorized = {
  mode: "home-featured-empty",
  environment: "preview",
  projectId: "81jpalr2",
  dataset: "preview",
  role: "ADMIN",
};

test("empty home QA is available only to an administrator in the isolated EYD Preview", () => {
  assert.equal(homeEmptyPreviewQa(authorized), true);
  for (const denied of [
    { role: undefined },
    { role: "USER" },
    { environment: "production" },
    { environment: "development" },
    { projectId: "another-project" },
    { dataset: "production" },
    { mode: undefined },
    { mode: ["home-featured-empty"] },
    { mode: "other" },
  ]) {
    assert.equal(homeEmptyPreviewQa({ ...authorized, ...denied }), false);
  }
});
