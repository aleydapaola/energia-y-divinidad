import { createHash } from "node:crypto";

import { MEMBERSHIP_CANCELLATION_POLICY } from "./commercial-policy";
import { deliverEmail } from "./email-delivery";
import { prisma } from "./prisma";
import { getAppUrl } from "./utils";

import type { Prisma } from "@prisma/client";

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  );
}

/** Persist the message with the delivery, so a retry can send it after a crash. */
export async function queueMembershipNotice(
  tx: Prisma.TransactionClient,
  input: {
    key: string;
    to: string;
    orderNumber: string;
    subscriptionId: string;
    plan: string;
    kind: "trial" | "payment" | "cancelled" | "failed";
    amount: number;
    currency: string;
    interval: "monthly" | "yearly";
    periodEnd: Date;
    renewalStopped?: boolean;
  }
) {
  const id = `membership-${createHash("sha256").update(input.key).digest("hex")}`;
  const date = input.periodEnd.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });
  const price = `${input.amount.toFixed(2)} ${input.currency} / ${input.interval === "yearly" ? "año" : "mes"}`;
  const heading = {
    trial: "Prueba de membresía activada — sin cargo hoy",
    payment: "Cobro de membresía confirmado",
    cancelled: "Renovación de membresía desactivada",
    failed: "Revisa el pago de tu membresía",
  }[input.kind];
  const explanation = {
    trial: `No se ha realizado un cobro hoy. Tu prueba finaliza el ${date} (Colombia). Después, se renovará por ${price}, salvo que desactives la renovación antes.`,
    payment: `Se ha verificado un cobro de ${input.amount.toFixed(2)} ${input.currency}. Tu período vigente finaliza el ${date} (Colombia). ${input.renewalStopped ? "La renovación está desactivada." : `La renovación autorizada es de ${price}.`}`,
    cancelled: `La renovación está desactivada en PayPal. Conservas tu acceso hasta el ${date} (Colombia). No se ha tramitado una devolución de dinero por esta cancelación.`,
    failed: `PayPal informa de un problema con la autorización o el cobro. El período ya concedido termina el ${date} (Colombia); un pago fallido no lo amplía. Consulta tu cuenta PayPal o contacta con Aleyda. La web no realiza reintentos de cobro por su cuenta.`,
  }[input.kind];
  const html = `<html><body style="font-family:Arial,sans-serif;color:#654177"><h1>${escape(heading)}</h1><p>${escape(input.plan)}</p><p>${escape(explanation)}</p><p>Pedido: ${escape(input.orderNumber)}</p><p>${escape(MEMBERSHIP_CANCELLATION_POLICY)}</p><p><a href="${escape(getAppUrl())}/dashboard/membresia/configuracion">Gestionar mi membresía</a></p><p>Consultas: contacto@energiaydivinidad.com</p></body></html>`;
  await tx.emailLog.upsert({
    where: { id },
    create: {
      id,
      to: input.to,
      template: `paypal_membership_${input.kind}`,
      subject: heading,
      entityType: "subscription",
      entityId: input.subscriptionId,
      status: "PENDING",
      metadata: { html, noticeKey: input.key },
    },
    update: {},
  });
  if (["trial", "payment"].includes(input.kind)) {
    const adminId = `${id}-admin`;
    await tx.emailLog.upsert({
      where: { id: adminId },
      create: {
        id: adminId,
        to: process.env.ADMIN_NOTIFICATION_EMAIL || "admin@energiaydivinidad.com",
        template: `paypal_membership_${input.kind}_admin`,
        subject: `Membresía: ${heading}`,
        entityType: "subscription",
        entityId: input.subscriptionId,
        status: "PENDING",
        metadata: {
          html: `<p>Actividad de membresía de ${escape(input.to)}.</p>${html}`,
          noticeKey: input.key,
        },
      },
      update: {},
    });
  }
  return id;
}

export async function deliverMembershipNotices(subscriptionId: string) {
  const pending = await prisma.emailLog.findMany({
    where: {
      entityType: "subscription",
      entityId: subscriptionId,
      template: { startsWith: "paypal_membership_" },
      status: { in: ["PENDING", "FAILED"] },
    },
    select: { id: true },
  });
  for (const { id } of pending) {
    // Serialize event/callback retries; Resend also deduplicates an uncertain response.
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`membership-email:${id}`}))`;
        const log = await tx.emailLog.findUnique({ where: { id } });
        if (!log || log.status === "SENT") {
          return;
        }
        const metadata = log.metadata as { html?: string } | null;
        if (!metadata?.html) {
          return;
        }
        try {
          const result = await deliverEmail(
            {
              from: process.env.EMAIL_FROM || "Energía y Divinidad <noreply@energiaydivinidad.com>",
              to: log.to,
              subject: log.subject || "Tu membresía",
              html: metadata.html,
            },
            { idempotencyKey: id }
          );
          if (result.error || !result.data?.id) {
            throw new Error("No se confirmó el envío del correo");
          }
          await tx.emailLog.update({
            where: { id },
            data: {
              status: "SENT",
              providerMessageId: result.data.id,
              sentAt: new Date(),
              errorMessage: null,
            },
          });
        } catch {
          await tx.emailLog.update({
            where: { id },
            data: { status: "FAILED", errorMessage: "Entrega pendiente de reintento" },
          });
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }
}
