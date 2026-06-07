import { getCommunicationAudienceOptions } from "@/lib/email-audiences";
import { prisma } from "@/lib/prisma";

import { CommunicationsClient } from "./CommunicationsClient";

export default async function AdminCommunicationsPage() {
  const [options, campaigns] = await Promise.all([
    getCommunicationAudienceOptions(),
    prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        _count: { select: { recipients: true } },
        recipients: { select: { status: true } },
      },
    }),
  ]);

  return (
    <CommunicationsClient
      options={options}
      initialCampaigns={campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        subject: campaign.subject,
        status: campaign.status,
        audienceName: campaign.audienceName,
        createdByEmail: campaign.createdByEmail,
        createdAt: campaign.createdAt.toISOString(),
        queuedAt: campaign.queuedAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        failedAt: campaign.failedAt?.toISOString() ?? null,
        totalRecipients: campaign._count.recipients,
        sent: campaign.recipients.filter((recipient) => recipient.status === "SENT").length,
        failed: campaign.recipients.filter((recipient) => recipient.status === "FAILED").length,
        queued: campaign.recipients.filter((recipient) => recipient.status === "QUEUED").length,
      }))}
    />
  );
}
