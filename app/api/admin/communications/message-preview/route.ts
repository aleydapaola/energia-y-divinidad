import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignMessage } from "@/lib/campaign-content";
import { renderCampaignHtml } from "@/lib/services/email-campaigns";

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const message = campaignMessage.safeParse(await request.json().catch(() => null));
  if (!message.success) {
    return NextResponse.json({ error: message.error.issues[0]?.message }, { status: 400 });
  }
  return NextResponse.json(
    { html: renderCampaignHtml(message.data) },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
