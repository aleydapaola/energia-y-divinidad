import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { NextResponse } from "next/server";

import { prisma } from "./prisma";

export class PublicFormError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: number
  ) {
    super(message);
  }
}

export function publicFormError(error: unknown) {
  if (error instanceof PublicFormError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined,
      }
    );
  }
  return NextResponse.json(
    { error: "No hemos podido completar la solicitud. Inténtalo de nuevo en unos minutos." },
    { status: 503 }
  );
}

// On Vercel this header is overwritten by its edge, rather than trusted from callers.
// Local requests share one bucket; arbitrary proxy headers cannot create new buckets.
export function publicFormIP(request: Request) {
  if (process.env.VERCEL !== "1") {
    return "local";
  }
  const ip = request.headers.get("x-forwarded-for")?.trim() || "";
  return isIP(ip) ? ip : "unknown";
}

export function formLimitKey(scope: string, identity: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new PublicFormError("La protección del formulario todavía no está disponible.", 503);
  }
  return createHmac("sha256", secret).update(`public-form-v1\0${scope}\0${identity}`).digest("hex");
}

/** Atomic across Vercel instances. Neither email addresses nor IPs are stored. */
export async function consumeFormLimit(
  scope: string,
  identity: string,
  max: number,
  windowMs: number
) {
  const key = formLimitKey(scope, identity);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "public_form_limits" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "public_form_limits"."resetAt" <= ${now} THEN 1
        ELSE LEAST("public_form_limits"."count" + 1, ${max + 1}) END,
      "resetAt" = CASE WHEN "public_form_limits"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "public_form_limits"."resetAt" END
    RETURNING "count", "resetAt"
  `;
  if (!rows[0] || rows[0].count > max) {
    const wait = Math.max(
      1,
      Math.ceil(((rows[0]?.resetAt.getTime() || resetAt.getTime()) - now.getTime()) / 1000)
    );
    throw new PublicFormError(
      "Has realizado varias solicitudes. Espera antes de intentarlo de nuevo.",
      429,
      wait
    );
  }
}

export async function limitVerificationEmail(email: string) {
  await consumeFormLimit("verification-email-hour", email, 3, 3_600_000);
  await consumeFormLimit("verification-email-minute", email, 1, 60_000);
}

export async function protectPublicForm(
  request: Request,
  input: { turnstileToken?: unknown; website?: unknown },
  action: "register" | "resend-verification"
) {
  if (input.website !== undefined && input.website !== "") {
    throw new PublicFormError("No se ha podido validar el formulario.");
  }
  await consumeFormLimit(action, publicFormIP(request), 5, 900_000);
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (
    !secret ||
    !siteKey ||
    (process.env.VERCEL_ENV === "production" &&
      (/^[123]x0{10,}/.test(secret) || /^[123]x0{10,}/.test(siteKey)))
  ) {
    throw new PublicFormError("La protección del formulario todavía no está disponible.", 503);
  }
  if (
    typeof input.turnstileToken !== "string" ||
    !input.turnstileToken ||
    input.turnstileToken.length > 2048
  ) {
    throw new PublicFormError("Completa la comprobación de seguridad antes de continuar.");
  }
  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: input.turnstileToken }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw Error("Unavailable");
    }
    result = await response.json();
  } catch {
    throw new PublicFormError("No se pudo comprobar la seguridad. Inténtalo de nuevo.", 503);
  }
  const production = process.env.VERCEL_ENV === "production";
  const allowedHosts = production
    ? ["www.energiaydivinidad.com", "energiaydivinidad.com"]
    : [
        "preview.energiaydivinidad.com",
        "energia-y-divinidad-git-preview-aleyda-paola-vargas-projects.vercel.app",
      ];
  const localTest =
    !process.env.VERCEL && process.env.NODE_ENV !== "production" && /^[123]x0{10,}/.test(siteKey);
  if (
    !result.success ||
    (!localTest && (!allowedHosts.includes(result.hostname) || result.action !== action))
  ) {
    throw new PublicFormError("La comprobación de seguridad ha caducado o no es válida. Repítela.");
  }
}
