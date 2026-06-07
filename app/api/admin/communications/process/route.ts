import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { processEmailCampaignBatch } from "@/lib/services/email-campaigns";

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const result = await processEmailCampaignBatch();
  return NextResponse.json({ ok: true, ...result });
}
