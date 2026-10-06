import { EmailCampaignAudienceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { previewCampaignAudience } from "@/lib/services/email-campaigns";

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const audienceType = body.audienceType as EmailCampaignAudienceType;

  if (!audienceType) {
    return NextResponse.json({ error: "Audiencia requerida" }, { status: 400 });
  }

  try {
    const preview = await previewCampaignAudience({
      audienceType,
      audienceId: body.audienceId,
      userIds: Array.isArray(body.userIds) ? body.userIds : undefined,
      manualEmails: typeof body.manualEmails === "string" ? body.manualEmails : undefined,
    });

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error calculando destinatarios" },
      { status: 400 }
    );
  }
}
