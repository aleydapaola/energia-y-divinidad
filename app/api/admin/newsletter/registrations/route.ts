import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  processRegistrationNewsletter,
  processRegistrationNewsletterBatch,
  registrationNewsletterEnabled,
} from "@/lib/registration-newsletter";

export const maxDuration = 180;

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await authorize();
  if (denied) {
    return denied;
  }
  const counts = await prisma.registrationNewsletter.groupBy({ by: ["status"], _count: true });
  return NextResponse.json(
    {
      enabled: registrationNewsletterEnabled(),
      counts: Object.fromEntries(counts.map((row) => [row.status, row._count])),
      securityConfigured:
        !!process.env.TURNSTILE_SECRET_KEY &&
        !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
        (process.env.AUTH_RATE_LIMIT_SECRET?.length || 0) >= 32,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const denied = await authorize();
  if (denied) {
    return denied;
  }
  if (!registrationNewsletterEnabled()) {
    return NextResponse.json({ error: "Integración pausada" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (body.userId !== undefined) {
    if (typeof body.userId !== "string" || body.userId.length > 100) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }
    await processRegistrationNewsletter(body.userId);
    return NextResponse.json({ processed: 1 });
  }
  return NextResponse.json(await processRegistrationNewsletterBatch());
}
