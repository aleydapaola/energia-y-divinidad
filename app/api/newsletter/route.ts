import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { previewEmailRecipient } from "@/lib/email-delivery";
import { rememberNewsletterCapture, newsletterCaptureResult } from "@/lib/newsletter-capture";
import {
  CAPTURE_SOURCES,
  CAPTURE_VARIANTS,
  CAPTURE_DEVICES,
  NEWSLETTER_CONSENT_VERSION,
} from "@/lib/newsletter-capture-rules";
import { isolatedMailchimpListId } from "@/lib/preview-safety";
import {
  consumeFormLimit,
  publicFormIP,
  PublicFormError,
  publicFormError,
} from "@/lib/public-form-security";

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = isolatedMailchimpListId();
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const captureSchema = z.object({
  acceptedNewsletter: z.literal(true),
  consentVersion: z.literal(NEWSLETTER_CONSENT_VERSION),
  source: z.enum(CAPTURE_SOURCES),
  variant: z.enum(CAPTURE_VARIANTS),
  device: z.enum(CAPTURE_DEVICES),
});

export async function POST(request: NextRequest) {
  try {
    const input = await request.json().catch(() => null);
    const parsedEmail = emailSchema.safeParse(input?.email);
    if (!parsedEmail.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Legacy clients keep the existing route during rollout. New capture forms
    // must supply their explicit acceptance and a bounded attribution context.
    const capture = input?.source === undefined ? null : captureSchema.safeParse(input);
    if (capture && !capture.success) {
      return NextResponse.json(
        { error: "Acepta la suscripción a la newsletter antes de continuar." },
        { status: 400 }
      );
    }
    if (input?.website) {
      return NextResponse.json({ error: "No se pudo validar el formulario." }, { status: 400 });
    }

    if (
      !MAILCHIMP_API_KEY ||
      !MAILCHIMP_LIST_ID ||
      !MAILCHIMP_SERVER_PREFIX ||
      !/^us\d+$/.test(MAILCHIMP_SERVER_PREFIX)
    ) {
      if (process.env.VERCEL_ENV !== "production") {
        return NextResponse.json(
          { error: "La newsletter de pruebas todavía no está disponible." },
          { status: 503 }
        );
      }
      console.error("Mailchimp environment variables not configured");
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
    }

    await consumeFormLimit("newsletter-form", publicFormIP(request), 5, 900_000);
    await consumeFormLimit("newsletter-email", parsedEmail.data, 3, 3_600_000);
    const listUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${encodeURIComponent(MAILCHIMP_LIST_ID)}`;
    const url = `${listUrl}/members`;
    const email =
      process.env.VERCEL_ENV === "production" ? parsedEmail.data : previewEmailRecipient();
    const headers = {
      Authorization: `Basic ${Buffer.from(`eyd:${MAILCHIMP_API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
    };

    const captureId = capture?.success
      ? await rememberNewsletterCapture(MAILCHIMP_LIST_ID, email, capture.data)
      : null;
    const result = async (status: "PENDING" | "EXISTING" | "INACTIVE" | "FAILED") => {
      if (captureId) {
        await newsletterCaptureResult(captureId, status);
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email_address: email,
        status: "pending", // Double opt-in: requires email confirmation
        tags: ["website"],
      }),
    });

    const data = await response.json();

    if (response.status === 400 && data.title === "Member Exists") {
      const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
      const member = await fetch(`${url}/${hash}?fields=status`, { headers, cache: "no-store" });
      if (!member.ok) {
        return NextResponse.json(
          { error: "No se pudo comprobar la suscripción. Inténtalo de nuevo." },
          { status: 502 }
        );
      }
      const { status } = await member.json();
      if (status === "subscribed") {
        await result("EXISTING");
        return NextResponse.json(
          { message: "Ya estás en nuestra lista", subscriptionStatus: "subscribed" },
          { status: 200 }
        );
      }
      if (status === "pending") {
        await result("PENDING");
        return NextResponse.json(
          {
            message: "Tu suscripción sigue pendiente. Revisa tu correo para confirmarla.",
            subscriptionStatus: "pending",
          },
          { status: 200 }
        );
      }
      // A self-unsubscribed contact must opt in through Mailchimp's hosted form.
      // Never override an unsubscribe or mark it as an active subscription.
      await result("INACTIVE");
      let signupUrl: string | undefined;
      const list = await fetch(`${listUrl}?fields=subscribe_url_long`, {
        headers,
        cache: "no-store",
      });
      if (list.ok) {
        const { subscribe_url_long } = await list.json();
        try {
          const candidate = new URL(subscribe_url_long);
          if (
            candidate.protocol === "https:" &&
            candidate.hostname.endsWith(".list-manage.com") &&
            !candidate.username &&
            !candidate.password
          ) {
            signupUrl = candidate.toString();
          }
        } catch {
          /* Keep the subscription unchanged when the hosted link is unavailable. */
        }
      }
      return NextResponse.json(
        {
          error: signupUrl
            ? "Completa tu inscripción en el formulario de confirmación para volver a suscribirte."
            : "Esta dirección no está suscrita. Contacta con Aleyda si quieres volver a inscribirte.",
          ...(signupUrl ? { signupUrl } : {}),
        },
        { status: 409 }
      );
    }

    if (!response.ok) {
      await result("FAILED");
      console.error("Mailchimp API error:", response.status, data.title);
      return NextResponse.json(
        { error: "Error al suscribirse. Por favor, intenta de nuevo." },
        { status: 500 }
      );
    }

    await result("PENDING");
    return NextResponse.json(
      {
        message:
          "Te hemos enviado la confirmación. Abre ese correo y confirma tu suscripción para recibir la meditación. Si no lo encuentras, revisa Spam o Promociones.",
        subscriptionStatus: "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PublicFormError) {
      return publicFormError(error);
    }
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
