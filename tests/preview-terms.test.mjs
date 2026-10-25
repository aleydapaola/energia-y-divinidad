import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(relative, dependencies = {}) {
  const filename = new URL("../" + relative, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : require(name));
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
const policy = load("lib/session-policy.ts");
const draft = load("lib/preview-terms.ts", { "./session-policy": policy });
const previewEnv = {
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SANITY_DATASET: "preview",
  PREVIEW_SANITY_DATASET: "preview",
};

test("terms draft is available only for isolated Preview/local contents and never Production", () => {
  const page = draft.getPreviewTermsPage(previewEnv);
  assert.equal(page.version, draft.PREVIEW_TERMS_VERSION);
  const text = page.content.flatMap((block) => block.children.map((span) => span.text)).join("\n");
  assert.match(text, /Aleyda Paola Vargas Galvis/);
  assert.ok(text.includes("Cédula de ciudadanía: 53.102.423."));
  assert.match(text, /NIT y dirección de notificación judicial: pendientes/);
  assert.match(text, /exclusivamente a las sesiones individuales/);
  for (const { label, text: statement } of policy.INDIVIDUAL_SESSION_POLICY) {
    assert.ok(text.includes(`${label}: ${statement}`));
  }
  for (const env of [
    { ...previewEnv, VERCEL_ENV: "production" },
    { ...previewEnv, NEXT_PUBLIC_SANITY_DATASET: "production" },
    { ...previewEnv, PREVIEW_SANITY_DATASET: undefined },
  ]) {
    assert.equal(draft.getPreviewTermsPage(env), null);
  }
});

test("terms resolver preserves a CMS page and uses the review draft only when contents are absent", async () => {
  for (const cmsPage of [null, { title: "CMS terms", version: "2.0" }]) {
    const { getTermsPage } = load("lib/terms.ts", {
      "@/sanity/lib/fetch": {
        sanityFetch: async ({ params }) => {
          assert.deepEqual(params, { slug: "terminos" });
          return cmsPage;
        },
      },
      "@/sanity/lib/queries": { LEGAL_PAGE_BY_SLUG_QUERY: "test-query" },
      "./preview-terms": { getPreviewTermsPage: () => draft.getPreviewTermsPage(previewEnv) },
    });
    assert.equal((await getTermsPage()).version, cmsPage?.version || draft.PREVIEW_TERMS_VERSION);
  }
});

test("Preview registration records the displayed terms version while Production preserves existing behavior", async () => {
  const saved = process.env.VERCEL_ENV;
  try {
    for (const environment of ["preview", "production"]) {
      process.env.VERCEL_ENV = environment;
      let created,
        termsReads = 0;
      const { POST } = load("app/api/auth/register/route.ts", {
        bcrypt: { default: { hash: async () => "test-only-hash" } },
        "@/lib/terms": {
          getTermsPage: async () => {
            termsReads++;
            return { version: draft.PREVIEW_TERMS_VERSION };
          },
        },
        "@/lib/email": { sendVerificationEmail: async () => ({ success: true }) },
        "@/lib/prisma": {
          prisma: {
            user: {
              findUnique: async () => null,
              create: async ({ data }) => {
                created = data;
                return { id: "test-only", ...data };
              },
            },
            verificationToken: { create: async () => ({}) },
          },
        },
      });
      const response = await POST({
        json: async () => ({
          name: "Test",
          email: "test@example.com",
          password: "test-only-password",
          acceptedTerms: true,
        }),
      });
      assert.equal(response.status, 201);
      assert.equal(
        created.acceptedTermsVersion,
        environment === "preview" ? draft.PREVIEW_TERMS_VERSION : "1.0"
      );
      assert.equal(termsReads, environment === "preview" ? 1 : 0);
    }
  } finally {
    if (saved === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = saved;
    }
  }
});
