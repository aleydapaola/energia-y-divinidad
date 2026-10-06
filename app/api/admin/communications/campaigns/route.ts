import { EmailCampaignAudienceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createEmailCampaign } from "@/lib/services/email-campaigns";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      _count: { select: { recipients: true } },
      recipients: {
        select: { status: true },
      },
    },
  });

  return NextResponse.json(
    campaigns.map((campaign) => {
      const sent = campaign.recipients.filter((recipient) => recipient.status === "SENT").length;
      const failed = campaign.recipients.filter(
        (recipient) => recipient.status === "FAILED"
      ).length;
      const queued = campaign.recipients.filter(
        (recipient) => recipient.status === "QUEUED"
      ).length;

      return {
        id: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        status: campaign.status,
        audienceType: campaign.audienceType,
        audienceName: campaign.audienceName,
        createdByEmail: campaign.createdByEmail,
        createdAt: campaign.createdAt.toISOString(),
        queuedAt: campaign.queuedAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        failedAt: campaign.failedAt?.toISOString() ?? null,
        totalRecipients: campaign._count.recipients,
        sent,
        failed,
        queued,
      };
    })
  );
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const campaign = await createEmailCampaign({
      createdById: session.user.id,
      createdByEmail: session.user.email,
      title: String(body.title || ""),
      subject: String(body.subject || ""),
      body: String(body.body || ""),
      audienceType: body.audienceType as EmailCampaignAudienceType,
      audienceId: body.audienceId,
      userIds: Array.isArray(body.userIds) ? body.userIds : undefined,
      manualEmails: typeof body.manualEmails === "string" ? body.manualEmails : undefined,
    });

    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      recipients: campaign._count.recipients,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creando campaña" },
      { status: 400 }
    );
  }
}
