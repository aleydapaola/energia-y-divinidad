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

  const preview = await previewCampaignAudience({
    audienceType,
    audienceId: body.audienceId,
    userIds: Array.isArray(body.userIds) ? body.userIds : undefined,
  });

  return NextResponse.json(preview);
}
