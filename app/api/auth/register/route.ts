import { randomBytes } from "node:crypto";

import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  limitVerificationEmail,
  protectPublicForm,
  publicFormError,
} from "@/lib/public-form-security";
import { registrationNewsletterEnabled } from "@/lib/registration-newsletter";
import {
  REGISTRATION_NEWSLETTER_TEXT,
  REGISTRATION_NEWSLETTER_VERSION,
} from "@/lib/registration-newsletter-copy";
import { getTermsPage } from "@/lib/terms";

export const maxDuration = 30;
const registrationInput = z.object({
  name: z.string().trim().min(1).max(150),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(128),
  acceptedTerms: z.literal(true),
  newsletterOptIn: z.boolean().optional().default(false),
  turnstileToken: z.string().max(2048).optional(),
  website: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = registrationInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revisa los datos y acepta los Términos y la Política de Privacidad." },
        { status: 400 }
      );
    }
    const input = parsed.data;
    await protectPublicForm(request, input, "register");
    if (input.newsletterOptIn && !registrationNewsletterEnabled()) {
      return NextResponse.json(
        {
          error:
            "La suscripción desde el registro todavía no está disponible. Puedes crear tu cuenta sin suscribirte.",
        },
        { status: 503 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return NextResponse.json(
        {
          error: "Este email ya está registrado",
          ...(!existing.emailVerified ? { code: "EMAIL_NOT_VERIFIED", email: existing.email } : {}),
        },
        { status: 400 }
      );
    }
    await limitVerificationEmail(input.email);
    const password = await bcrypt.hash(input.password, 12);
    const termsVersion =
      process.env.VERCEL_ENV === "production" ? "1.0" : (await getTermsPage())?.version || "1.0";
    const token = randomBytes(32).toString("hex");
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          password,
          emailVerified: null,
          acceptedTermsVersion: termsVersion,
          acceptedTermsAt: new Date(),
          ...(input.newsletterOptIn
            ? {
                registrationNewsletter: {
                  create: {
                    consentVersion: REGISTRATION_NEWSLETTER_VERSION,
                    consentText: REGISTRATION_NEWSLETTER_TEXT,
                  },
                },
              }
            : {}),
        },
      });
      await tx.verificationToken.create({
        data: { identifier: input.email, token, expires: new Date(Date.now() + 86_400_000) },
      });
      return created;
    });
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name || "Usuario",
        token,
        newsletterOptIn: input.newsletterOptIn,
      });
    } catch {
      await prisma.$transaction(async (tx) => {
        await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
        await tx.user.delete({ where: { id: user.id } });
      });
      return NextResponse.json(
        {
          error:
            "No hemos podido enviar el email de verificación. Inténtalo de nuevo en unos minutos.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        message: "Cuenta creada. Revisa tu correo para verificarla.",
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: 201 }
    );
  } catch (error) {
    return publicFormError(error);
  }
}
