import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { previewEmailRecipient } from "@/lib/email-delivery";
import { isolatedMailchimpListId } from "@/lib/preview-safety";

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = isolatedMailchimpListId();
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export async function POST(request: NextRequest) {
  try {
    const input = await request.json().catch(() => null);
    const parsedEmail = emailSchema.safeParse(input?.email);
    if (!parsedEmail.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
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

    const listUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${encodeURIComponent(MAILCHIMP_LIST_ID)}`;
    const url = `${listUrl}/members`;
    const email =
      process.env.VERCEL_ENV === "production" ? parsedEmail.data : previewEmailRecipient();
    const headers = {
      Authorization: `Basic ${Buffer.from(`eyd:${MAILCHIMP_API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
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
        return NextResponse.json({ message: "Ya estás en nuestra lista" }, { status: 200 });
      }
      if (status === "pending") {
        return NextResponse.json(
          { message: "Tu suscripción sigue pendiente. Revisa tu correo para confirmarla." },
          { status: 200 }
        );
      }
      // A self-unsubscribed contact must opt in through Mailchimp's hosted form.
      // Never override an unsubscribe or mark it as an active subscription.
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
      console.error("Mailchimp API error:", response.status, data.title);
      return NextResponse.json(
        { error: "Error al suscribirse. Por favor, intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "¡Revisa tu correo para confirmar tu suscripción!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
