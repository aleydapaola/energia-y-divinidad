// Static visual QA only: real EYD components/CSS with framework adapters.
// No Next server, environment loading, database, providers, scripts or form submission.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadMembership } from "../tests/helpers/membership-loader.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(path.join(tmpdir(), "eyd-newsletter-visual-"));
const cssFile = path.join(output, "style.css");
const css = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/tailwindcss/lib/cli.js"),
    "--config",
    path.join(root, "tailwind.config.ts"),
    "--input",
    path.join(root, "app/globals.css"),
    "--output",
    cssFile,
  ],
  // Keep Browserslist from searching parent folders outside this repository.
  { cwd: root, encoding: "utf8", env: { ...process.env, BROWSERSLIST: "defaults" } }
);
if (css.status !== 0) {
  throw new Error(`No se pudo generar el CSS de QA: ${css.stderr || css.error?.message}`);
}

const rules = loadMembership("lib/newsletter-capture-rules.ts");
const link = { default: "a" };
const image = {
  default: ({ priority: _priority, ...props }) => React.createElement("img", props),
};
const formDependencies = {
  "next/link": link,
  "@/lib/newsletter-capture-rules": rules,
  "@/lib/newsletter-capture-client": {
    captureContext() {
      throw new Error("No browser submission in static QA");
    },
    captureMetric() {},
    rememberNewsletterRequest() {},
  },
};
const { NewsletterForm } = loadMembership(
  "components/newsletter/NewsletterForm.tsx",
  formDependencies
);
// The pending API message is injected without a request. This exercises only
// the real component's static layout, not hydration, delivery or persistence.
const pendingMessage =
  "Te hemos enviado la confirmación. Abre ese correo y confirma tu suscripción para recibir la meditación. Si no lo encuentras, revisa Spam o Promociones.";
const pendingState = ["", "success", pendingMessage, null, true, ""];
let pendingCursor = 0;
const { NewsletterForm: PendingForm } = loadMembership("components/newsletter/NewsletterForm.tsx", {
  ...formDependencies,
  react: {
    ...React,
    useState(initial) {
      const index = pendingCursor++;
      return [index < pendingState.length ? pendingState[index] : initial, () => {}];
    },
    useEffect() {},
  },
});
function PendingFormFixture() {
  pendingCursor = 0;
  return PendingForm({ variant: "card", source: "landing" });
}
const { Footer } = loadMembership("components/layout/Footer.tsx", {
  "next/link": link,
  "next/image": image,
  "@/components/newsletter": { NewsletterForm },
  "@/lib/config/features": { features: { events: true } },
});
const { MeditationSignup } = loadMembership("components/newsletter/MeditationSignup.tsx", {
  "./NewsletterForm": { NewsletterForm },
});
const { default: Landing } = loadMembership("app/meditacion-gratis/page.tsx", {
  "next/link": link,
  "next/image": image,
  "@/components/newsletter/NewsletterForm": { NewsletterForm },
});
// Render the real summary with an empty synthetic dataset. Do not fetch or
// replace data in Preview to exercise a state that is absent from its sample.
const { NewsletterCaptureAdmin: EmptyCaptureSummary } = loadMembership(
  "components/newsletter/NewsletterCaptureAdmin.tsx",
  {
    react: {
      useState: (initial) => [initial === null ? { captures: [], metrics: [] } : initial, () => {}],
      useEffect() {},
    },
  }
);

const fontFile = path.join(root, ".next/static/css/b9abd0f3c4a75451.css");
const fonts = existsSync(fontFile) ? readFileSync(fontFile, "utf8") : "";
const assets = new Map([
  ["/style.css", { body: readFileSync(cssFile), type: "text/css" }],
  ["/fonts.css", { body: fonts, type: "text/css" }],
]);
for (const pathname of [
  "/images/EnergiaDinividadHeading.png",
  "/images/Aleyda-home-comprimida.jpeg",
  "/images/energia-divinidad-Logo-NoBackground.png",
  "/fonts/paciencia.otf",
]) {
  assets.set(pathname, {
    body: readFileSync(path.join(root, "public", pathname)),
    type: { ".png": "image/png", ".jpeg": "image/jpeg", ".otf": "font/otf" }[
      path.extname(pathname)
    ],
  });
}
for (const match of fonts.matchAll(/url\(([^)]+)\)/g)) {
  const pathname = match[1].replaceAll(/["']/g, "");
  if (/^\/_next\/static\/media\/[\w.-]+\.(woff2?|ttf|otf)$/.test(pathname)) {
    assets.set(pathname, {
      body: readFileSync(path.join(root, ".next/static/media", path.basename(pathname))),
      type: pathname.endsWith(".woff2") ? "font/woff2" : "font/woff",
    });
  }
}

function html(title, body) {
  let markup = renderToStaticMarkup(body);
  let styles = `${assets.get("/style.css").body.toString()}\n${fonts}`;
  for (const [pathname, asset] of assets) {
    if (pathname.endsWith(".css")) {
      continue;
    }
    const inline = `data:${asset.type};base64,${asset.body.toString("base64")}`;
    markup = markup.replaceAll(pathname, inline);
    styles = styles.replaceAll(pathname, inline);
  }
  // Preserve the real #recibir anchor while preventing navigation to services
  // or filesystem paths from this static fixture.
  markup = markup.replace(/(<a\b[^>]*\bhref=")(?!#)[^"]*"/g, '$1#qa-navigation-disabled"');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>QA local estática · ${title}</title><style>${styles}\n:root{--font-open-sans:"Open Sans",sans-serif;--font-dm-sans:"DM Sans",sans-serif;--font-gazeta-italic:"gazetaItalic",serif}body{margin:0}</style></head><body>${markup}</body></html>`;
}
const pages = new Map([
  ["/meditacion-gratis", html("Landing EYD", await Landing({ searchParams: Promise.resolve({}) }))],
  [
    "/footer",
    html(
      "Formulario y pie EYD",
      React.createElement(
        React.Fragment,
        null,
        React.createElement(MeditationSignup, { source: "home" }),
        React.createElement(Footer)
      )
    ),
  ],
  [
    "/newsletter-pending",
    html(
      "Confirmación pendiente · estado simulado",
      React.createElement(
        "main",
        { className: "mx-auto min-h-screen max-w-xl p-4 sm:p-6" },
        React.createElement(
          "p",
          { className: "mb-4 text-sm text-gray-600" },
          "QA local estática · estado pendiente simulado · no se ha enviado ningún correo"
        ),
        React.createElement(PendingFormFixture)
      )
    ),
  ],
  [
    "/admin-capture-empty",
    html(
      "ADMIN sin muestra · datos simulados",
      React.createElement(
        "main",
        { className: "min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" },
        React.createElement(
          "p",
          { className: "mb-4 text-sm text-gray-600" },
          "QA local estática · datos simulados · sin conexión a Preview"
        ),
        React.createElement(EmptyCaptureSummary)
      )
    ),
  ],
]);
for (const [pathname, page] of pages) {
  const filename = path.join(output, `${pathname.slice(1)}.html`);
  writeFileSync(filename, page);
  console.log(pathToFileURL(filename).href);
}
console.log(
  `CSS actual; fuentes del build disponibles: ${Boolean(fonts)}. Sin servidor, APIs, scripts ni envío de formularios. Solo QA visual estática.`
);
