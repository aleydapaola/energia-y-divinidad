import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignAudienceInput } from "@/lib/campaign-audience-input";
import { previewCampaignAudience } from "@/lib/services/email-campaigns";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const audience = campaignAudienceInput.safeParse(await request.json().catch(() => null));
  if (!audience.success) {
    return NextResponse.json({ error: "Selección de audiencia inválida" }, { status: 400 });
  }

  try {
    const preview = await previewCampaignAudience(audience.data);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error calculando destinatarios" },
      { status: 400 }
    );
  }
}
