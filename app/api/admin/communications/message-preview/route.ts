import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignMessage } from "@/lib/campaign-content";
import { campaignDownloads } from "@/lib/services/campaign-drive";
import { renderCampaignHtml, resolveCampaignFooter } from "@/lib/services/email-campaigns";

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const message = campaignMessage.safeParse(await request.json().catch(() => null));
  if (!message.success) {
    return NextResponse.json({ error: message.error.issues[0]?.message }, { status: 400 });
  }
  try {
    const { draftId, ...content } = message.data;
    const newsletterFooter = await resolveCampaignFooter(content.kind);
    const attachments = draftId ? await campaignDownloads(draftId) : [];
    return NextResponse.json(
      { html: renderCampaignHtml({ ...content, newsletterFooter, attachments }) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar la configuración de Mailchimp o los PDF en Drive" },
      { status: 503 }
    );
  }
}
