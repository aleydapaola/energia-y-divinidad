import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { sendCampaignTestEmail } from "@/lib/services/email-campaigns";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const to = String(body.to || session.user.email || "")
    .trim()
    .toLowerCase();
  const subject = String(body.subject || "").trim();
  const emailBody = String(body.body || "").trim();

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Email de prueba inválido" }, { status: 400 });
  }
  if (!subject || !emailBody) {
    return NextResponse.json({ error: "Asunto y cuerpo son requeridos" }, { status: 400 });
  }

  const result = await sendCampaignTestEmail({
    to,
    subject,
    body: emailBody,
    campaignId: body.campaignId,
  });

  if (!result.success) {
    return NextResponse.json({ error: "No se pudo enviar la prueba" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
