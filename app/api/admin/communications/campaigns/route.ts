import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { campaignAudienceInput } from "@/lib/campaign-audience-input";
import { campaignMessage } from "@/lib/campaign-content";
import { prisma } from "@/lib/prisma";
import { CampaignAudienceChanged, createEmailCampaign } from "@/lib/services/email-campaigns";

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
    const message = campaignMessage.parse(body);
    const audience = campaignAudienceInput.parse(body);
    if (
      typeof body.audienceFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.audienceFingerprint)
    ) {
      return NextResponse.json(
        { error: "Previsualiza y confirma la audiencia antes de continuar" },
        { status: 400 }
      );
    }
    const draft =
      typeof body.draft?.id === "string" &&
      typeof body.draft?.updatedAt === "string" &&
      Number.isFinite(Date.parse(body.draft.updatedAt))
        ? { id: body.draft.id, updatedAt: body.draft.updatedAt }
        : undefined;
    if (body.draft && !draft) {
      return NextResponse.json({ error: "Borrador inválido" }, { status: 400 });
    }
    const campaign = await createEmailCampaign({
      createdById: session.user.id,
      createdByEmail: session.user.email,
      title: String(body.title || ""),
      ...message,
      draft,
      ...audience,
      audienceFingerprint: body.audienceFingerprint,
    });

    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      recipients: campaign._count.recipients,
    });
  } catch (error) {
    if (error instanceof CampaignAudienceChanged) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error creando campaña" },
      { status: 400 }
    );
  }
}
