import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  limitVerificationEmail,
  protectPublicForm,
  publicFormError,
} from "@/lib/public-form-security";

export const maxDuration = 30;
const message = "Si la cuenta necesita verificación, recibirás un enlace por correo.";

export async function POST(request: NextRequest) {
  try {
    const input = await request.json().catch(() => null);
    const parsed = z.string().trim().email().max(254).safeParse(input?.email);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    await protectPublicForm(request, input, "resend-verification");
    const email = parsed.data.toLowerCase();
    await limitVerificationEmail(email);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { registrationNewsletter: { select: { consentAt: true } } },
    });
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true, message });
    }
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 86_400_000) },
    });
    try {
      await sendVerificationEmail({
        email,
        name: user.name || "Usuario",
        token,
        newsletterOptIn: !!user.registrationNewsletter,
      });
    } catch {
      await prisma.verificationToken.deleteMany({ where: { token } });
      return NextResponse.json(
        { error: "No se pudo enviar el enlace. Inténtalo más tarde." },
        { status: 502 }
      );
    }
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, token: { not: token } },
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return publicFormError(error);
  }
}
