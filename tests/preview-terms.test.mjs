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
const commercial = load("lib/commercial-policy.ts");
const draft = load("lib/preview-terms.ts", {
  "./session-policy": policy,
  "./commercial-policy": commercial,
});
const previewEnv = {
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SANITY_DATASET: "preview",
  PREVIEW_SANITY_DATASET: "preview",
};

test("other legal drafts remain isolated and share the confirmed holder identification", () => {
  const { getPreviewLegalPage } = load("lib/preview-legal-pages.ts", { "./preview-terms": draft });
  for (const slug of ["privacidad", "cookies", "aviso-legal"]) {
    const page = getPreviewLegalPage(slug, previewEnv);
    assert.equal(page.slug.current, slug);
    assert.ok(page.title.includes("borrador de pruebas"));
    const text = page.content
      .flatMap((block) => block.children.map((span) => span.text))
      .join("\n");
    assert.ok(text.includes(draft.PREVIEW_HOLDER_IDENTIFICATION));
    for (const env of [
      { ...previewEnv, VERCEL_ENV: "production" },
      { ...previewEnv, NEXT_PUBLIC_SANITY_DATASET: "production" },
      { ...previewEnv, PREVIEW_SANITY_DATASET: undefined },
    ]) {
      assert.equal(getPreviewLegalPage(slug, env), null);
    }
  }
});

test("legal resolver preserves published CMS policies and propagates network failures", async () => {
  for (const slug of ["privacidad", "cookies", "aviso-legal"]) {
    const cms = { _id: "existing-cms-policy", title: "Existing approved policy" };
    let result = cms;
    const { getLegalPage } = load("lib/legal-pages.ts", {
      "@/sanity/lib/fetch": {
        sanityFetch: async ({ params }) => {
          assert.deepEqual(params, { slug });
          if (result instanceof Error) {
            throw result;
          }
          return result;
        },
      },
      "@/sanity/lib/queries": { LEGAL_PAGE_BY_SLUG_QUERY: "test-query" },
      "./preview-legal-pages": { getPreviewLegalPage: () => ({ _id: "review-draft" }) },
    });
    assert.equal(await getLegalPage(slug), cms);
    result = null;
    assert.deepEqual(await getLegalPage(slug), { _id: "review-draft" });
    result = new Error("Network failure");
    await assert.rejects(getLegalPage(slug), /Network failure/);
  }
});

test("terms draft is available only for isolated Preview/local contents and never Production", () => {
  const page = draft.getPreviewTermsPage(previewEnv);
  assert.equal(page.version, draft.PREVIEW_TERMS_VERSION);
  const text = page.content.flatMap((block) => block.children.map((span) => span.text)).join("\n");
  assert.match(text, /Aleyda Paola Vargas Galvis/);
  assert.ok(text.includes("Cédula de ciudadanía: 53.102.423."));
  assert.match(text, /NIT: pendiente de confirmación/);
  assert.match(text, /exclusivamente a las sesiones individuales/);
  for (const key of [
    "COURSE_REFUND_POLICY",
    "DIGITAL_REFUND_POLICY",
    "EVENT_REFUND_POLICY",
    "MEMBERSHIP_CANCELLATION_POLICY",
    "REFUND_REQUEST_POLICY",
    "CONSUMER_RIGHTS_POLICY",
  ]) {
    assert.ok(text.includes(commercial[key]), key);
  }
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
