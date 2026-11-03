import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { processRegistrationNewsletterBatch } from "@/lib/registration-newsletter";
import { processEmailCampaignBatch } from "@/lib/services/email-campaigns";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "development") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await processEmailCampaignBatch();
  // Reuse the daily schedule. Failure here must not undo unrelated campaign work.
  let registrationNewsletter = { processed: 0, failed: false };
  try {
    registrationNewsletter = { ...(await processRegistrationNewsletterBatch()), failed: false };
    await prisma.publicFormLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  } catch {
    registrationNewsletter.failed = true;
  }
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...result,
    registrationNewsletter,
  });
}

export function GET(request: NextRequest) {
  return POST(request);
}
