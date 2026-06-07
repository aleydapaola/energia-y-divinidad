import {
  EmailCampaignAudienceType,
  EmailCampaignStatus,
  EmailRecipientStatus,
  Prisma,
} from "@prisma/client";

import { sendEmailWithLogging } from "@/lib/email";
import {
  getAudienceName,
  resolveEmailAudience,
  type EmailRecipientCandidate,
} from "@/lib/email-audiences";
import { prisma } from "@/lib/prisma";

const DEFAULT_BATCH_SIZE = 25;

export interface CreateEmailCampaignInput {
  createdById: string;
  createdByEmail: string;
  title: string;
  subject: string;
  body: string;
  audienceType: EmailCampaignAudienceType;
  audienceId?: string | null;
  userIds?: string[];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderCampaignHtml(params: {
  subject: string;
  body: string;
  previewName?: string | null;
}) {
  const greeting = params.previewName ? `Hola ${escapeHtml(params.previewName)},` : "Hola,";
  const paragraphs = params.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => escapeHtml(paragraph).replace(/\n/g, "<br />"));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(params.subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8f0f5;font-family:Arial,sans-serif;color:#333;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f0f5;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eaddec;">
                <tr>
                  <td style="padding:28px 32px;background:#654177;color:#ffffff;">
                    <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:600;">${escapeHtml(params.subject)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;font-size:16px;line-height:1.7;">
                    <p style="margin:0 0 18px;">${greeting}</p>
                    ${paragraphs
                      .map((paragraph) => `<p style="margin:0 0 18px;">${paragraph}</p>`)
                      .join("")}
                    <p style="margin:28px 0 0;color:#654177;">Con cariño,<br />Aleyda</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;background:#fbf8fb;color:#777;font-size:12px;line-height:1.5;">
                    Energía y Divinidad · Este correo se envía porque tienes una relación activa con la web.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function validateCampaignInput(input: CreateEmailCampaignInput) {
  if (!input.title.trim()) {
    throw new Error("El título interno es requerido");
  }
  if (!input.subject.trim()) {
    throw new Error("El asunto es requerido");
  }
  if (!input.body.trim()) {
    throw new Error("El cuerpo del email es requerido");
  }
  if (
    input.audienceType !== "ALL_USERS" &&
    input.audienceType !== "SELECTED_USERS" &&
    !input.audienceId
  ) {
    throw new Error("Selecciona una audiencia");
  }
}

export async function previewCampaignAudience(params: {
  audienceType: EmailCampaignAudienceType;
  audienceId?: string | null;
  userIds?: string[];
}) {
  const recipients = await resolveEmailAudience(params);
  return {
    count: recipients.length,
    recipients: recipients.slice(0, 25),
  };
}

export async function createEmailCampaign(input: CreateEmailCampaignInput) {
  validateCampaignInput(input);

  const recipients = await resolveEmailAudience({
    audienceType: input.audienceType,
    audienceId: input.audienceId,
    userIds: input.userIds,
  });

  if (recipients.length === 0) {
    throw new Error("La audiencia no tiene destinatarios");
  }

  const audienceName = await getAudienceName({
    audienceType: input.audienceType,
    audienceId: input.audienceId,
    userIds: input.userIds,
  });

  return prisma.emailCampaign.create({
    data: {
      createdById: input.createdById,
      createdByEmail: input.createdByEmail,
      title: input.title.trim(),
      subject: input.subject.trim(),
      body: input.body.trim(),
      status: "QUEUED",
      audienceType: input.audienceType,
      audienceId: input.audienceId,
      audienceName,
      audienceMeta:
        input.audienceType === "SELECTED_USERS"
          ? ({ userIds: input.userIds ?? [] } satisfies Prisma.InputJsonValue)
          : undefined,
      queuedAt: new Date(),
      recipients: {
        createMany: {
          data: recipients.map((recipient) => ({
            userId: recipient.userId,
            email: recipient.email,
            name: recipient.name,
            status: "QUEUED",
          })),
          skipDuplicates: true,
        },
      },
    },
    include: {
      _count: { select: { recipients: true } },
    },
  });
}

export async function sendCampaignTestEmail(params: {
  to: string;
  subject: string;
  body: string;
  campaignId?: string;
}) {
  const html = renderCampaignHtml({
    subject: `[Prueba] ${params.subject}`,
    body: params.body,
    previewName: "Aleyda",
  });

  const result = await sendEmailWithLogging({
    to: params.to,
    subject: `[Prueba] ${params.subject}`,
    template: "admin_campaign_test",
    html,
    entityType: params.campaignId ? "email_campaign" : undefined,
    entityId: params.campaignId,
    metadata: { originalSubject: params.subject },
  });

  if (params.campaignId && result.success) {
    await prisma.emailCampaign.update({
      where: { id: params.campaignId },
      data: { testSentAt: new Date() },
    });
  }

  return result;
}

function sendRecipientEmail(params: {
  campaign: {
    id: string;
    subject: string;
    body: string;
    audienceType: EmailCampaignAudienceType;
    audienceId: string | null;
  };
  recipient: EmailRecipientCandidate & { id: string };
}) {
  const html = renderCampaignHtml({
    subject: params.campaign.subject,
    body: params.campaign.body,
    previewName: params.recipient.name,
  });

  return sendEmailWithLogging({
    to: params.recipient.email,
    subject: params.campaign.subject,
    template: "admin_campaign",
    html,
    entityType: "email_campaign",
    entityId: params.campaign.id,
    metadata: {
      recipientId: params.recipient.id,
      audienceType: params.campaign.audienceType,
      audienceId: params.campaign.audienceId,
    },
  });
}

export async function processEmailCampaignBatch(batchSize = DEFAULT_BATCH_SIZE) {
  const campaign = await prisma.emailCampaign.findFirst({
    where: {
      status: { in: [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING] },
      recipients: { some: { status: EmailRecipientStatus.QUEUED } },
    },
    orderBy: { queuedAt: "asc" },
    include: {
      recipients: {
        where: { status: EmailRecipientStatus.QUEUED },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      },
    },
  });

  if (!campaign) {
    return { processed: 0, successful: 0, failed: 0, campaignId: null };
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  let successful = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    const result = await sendRecipientEmail({
      campaign,
      recipient: {
        id: recipient.id,
        userId: recipient.userId,
        email: recipient.email,
        name: recipient.name,
      },
    });

    if (result.success) {
      successful++;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SENT",
          providerMessageId: result.messageId,
          emailLogId: result.emailLogId,
          sentAt: new Date(),
        },
      });
    } else {
      failed++;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "FAILED",
          emailLogId: result.emailLogId,
          errorMessage:
            result.error instanceof Error ? result.error.message : "Error enviando email",
        },
      });
    }
  }

  const remaining = await prisma.emailCampaignRecipient.count({
    where: { campaignId: campaign.id, status: "QUEUED" },
  });
  const failedTotal = await prisma.emailCampaignRecipient.count({
    where: { campaignId: campaign.id, status: "FAILED" },
  });

  if (remaining === 0) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failedTotal > 0 ? "FAILED" : "SENT",
        sentAt: failedTotal > 0 ? null : new Date(),
        failedAt: failedTotal > 0 ? new Date() : null,
        errorMessage: failedTotal > 0 ? `${failedTotal} destinatario(s) fallaron` : null,
      },
    });
  }

  return {
    processed: campaign.recipients.length,
    successful,
    failed,
    campaignId: campaign.id,
  };
}
