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
const APP_URL =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.energiaydivinidad.com";
const LOGO_URL = "https://energia-y-divinidad.vercel.app/images/logoNoBackground.png";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@energiaydivinidad.com";

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

function linkifyEscapedText(value: string) {
  const escaped = escapeHtml(value);
  return escaped.replace(
    /(https?:\/\/[^\s<]+|www\.[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
    (match) => {
      let href = `https://${match}`;
      if (match.includes("@")) {
        href = `mailto:${match}`;
      } else if (match.startsWith("http")) {
        href = match;
      }

      return `<a href="${href}" style="color:#4944a4;text-decoration:underline;text-decoration-color:#c8b8d4;">${match}</a>`;
    }
  );
}

function renderMessageBlocks(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const isBulletList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));

      if (isBulletList) {
        return `
          <ul style="margin:0 0 22px;padding:0 0 0 22px;color:#654177;">
            ${lines
              .map((line) => line.replace(/^[-*]\s+/, ""))
              .map(
                (line) =>
                  `<li style="margin:0 0 10px;font-size:16px;line-height:1.7;color:#654177;">${linkifyEscapedText(line)}</li>`
              )
              .join("")}
          </ul>
        `;
      }

      return `
        <p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#654177;">
          ${lines.map((line) => linkifyEscapedText(line)).join("<br />")}
        </p>
      `;
    })
    .join("");
}

export function renderCampaignHtml(params: {
  subject: string;
  body: string;
  previewName?: string | null;
}) {
  const safeSubject = escapeHtml(params.subject);
  const greeting = params.previewName ? `Hola ${escapeHtml(params.previewName)},` : "Hola,";
  const messageBlocks = renderMessageBlocks(params.body);
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeSubject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f8f0f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#654177;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background-color:#f8f0f5;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:24px 0 30px;">
                    <a href="${APP_URL}" style="text-decoration:none;">
                      <img src="${LOGO_URL}" alt="Energía y Divinidad" style="display:block;max-width:190px;height:auto;border:0;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(101,65,119,0.10);border:1px solid #eaddec;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:32px 38px 28px;background-color:#654177;">
                          <p style="margin:0 0 10px;font-size:13px;letter-spacing:0;text-transform:uppercase;color:#f8f0f5;font-weight:600;">
                            Energía y Divinidad
                          </p>
                          <h1 style="margin:0;font-size:26px;line-height:1.35;color:#ffffff;font-weight:600;">
                            ${safeSubject}
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:38px 38px 34px;">
                          <p style="margin:0 0 20px;font-size:18px;line-height:1.6;color:#654177;font-weight:600;">
                            ${greeting}
                          </p>
                          ${messageBlocks}
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-top:30px;">
                            <tr>
                              <td style="padding:22px;background-color:#fdf8ff;border-radius:12px;border:1px solid #e9d8f4;">
                                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#654177;">
                                  Con cariño y luz,
                                </p>
                                <p style="margin:0;font-size:17px;line-height:1.5;color:#8A4BAF;font-weight:700;">
                                  Aleyda Paola
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:28px 18px 0;">
                    <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#999999;">
                      © ${year} Energía y Divinidad. Todos los derechos reservados.
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#999999;">
                      Este correo se envía porque tienes una relación activa con la web.
                      <br />
                      ¿Preguntas? <a href="mailto:${CONTACT_EMAIL}" style="color:#8A4BAF;text-decoration:none;">${CONTACT_EMAIL}</a>
                    </p>
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
