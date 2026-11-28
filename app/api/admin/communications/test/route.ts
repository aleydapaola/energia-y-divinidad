import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignMessage } from "@/lib/campaign-content";
import { sendCampaignTestEmail } from "@/lib/services/email-campaigns";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = campaignMessage.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const to = String(body.to || session.user.email || "")
    .trim()
    .toLowerCase();

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Email de prueba inválido" }, { status: 400 });
  }
  try {
    const result = await sendCampaignTestEmail({ to, ...parsed.data });

    if (!result.success) {
      return NextResponse.json({ error: "No se pudo enviar la prueba" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el correo de prueba" }, { status: 503 });
  }
}
