import { NextRequest, NextResponse } from "next/server";

import { processEmailCampaignBatch } from "@/lib/services/email-campaigns";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "development") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await processEmailCampaignBatch();
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...result,
  });
}

export function GET(request: NextRequest) {
  return POST(request);
}
