import { NextRequest, NextResponse } from "next/server";

import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { consumeFormLimit, publicFormIP, publicFormError } from "@/lib/public-form-security";
import {
  processRegistrationNewsletter,
  registrationNewsletterStatus,
} from "@/lib/registration-newsletter";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: "Enlace de verificación inválido." }, { status: 400 });
    }
    await consumeFormLimit("verify-email", publicFormIP(request), 30, 900_000);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verify-email:${token}`}))`;
      const verification = await tx.verificationToken.findUnique({ where: { token } });
      if (!verification || verification.expires < new Date()) {
        return null;
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`verify-account:${verification.identifier}`}))`;
      const user = await tx.user.findUnique({ where: { email: verification.identifier } });
      if (!user) {
        return null;
      }
      const alreadyVerified = !!user.emailVerified;
      const now = new Date();
      if (!alreadyVerified) {
        await tx.user.update({ where: { id: user.id }, data: { emailVerified: now } });
        await tx.registrationNewsletter.updateMany({
          where: { userId: user.id, status: "AWAITING_EMAIL" },
          data: { verifiedAt: now, status: "READY", nextAttemptAt: now },
        });
      }
      await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
      return { user, alreadyVerified };
    });
    if (!result) {
      return NextResponse.json(
        {
          error:
            "El enlace ha caducado o ya se ha utilizado. Si ya verificaste tu cuenta, puedes iniciar sesión.",
        },
        { status: 400 }
      );
    }
    if (!result.alreadyVerified) {
      try {
        await sendWelcomeEmail({ email: result.user.email, name: result.user.name || "Usuario" });
      } catch {
        /* Account activation succeeds independently of welcome delivery. */
      }
    }
    try {
      await processRegistrationNewsletter(result.user.id);
    } catch {
      /* Durable work can retry. */
    }
    let newsletter;
    try {
      newsletter = await registrationNewsletterStatus(result.user.id);
    } catch {
      /* Do not fail account verification. */
    }
    return NextResponse.json({
      success: true,
      message: "¡Tu email ha sido verificado! Ya puedes iniciar sesión.",
      ...(newsletter ? { newsletter } : {}),
    });
  } catch (error) {
    return publicFormError(error);
  }
}
