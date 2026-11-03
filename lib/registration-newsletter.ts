import { createHash } from "node:crypto";

import { previewEmailRecipient } from "./email-delivery";
import { processRegistrationNewsletterGift, readNewsletterList } from "./newsletter-gift";
import { newsletterGiftConfiguration } from "./newsletter-gift-config";
import { prisma } from "./prisma";
import { REGISTRATION_NEWSLETTER_VERSION } from "./registration-newsletter-copy";

const ACTIVE_WORK = ["READY", "RETRY"];

export function registrationNewsletterEnabled() {
  return process.env.REGISTRATION_NEWSLETTER_ENABLED === "true";
}

export async function registrationNewsletterStatus(userId: string) {
  const record = await prisma.registrationNewsletter.findUnique({ where: { userId } });
  if (!record) {
    return undefined;
  }
  const config = newsletterGiftConfiguration();
  let signupUrl: string | undefined;
  if (record.status === "RESUBSCRIBE_REQUIRED") {
    try {
      signupUrl = (await readNewsletterList(config)).list.subscribe_url_long;
    } catch {
      /* Retry later. */
    }
  }
  return {
    status:
      record.status === "ACTIVE"
        ? "subscribed"
        : record.status === "RESUBSCRIBE_REQUIRED"
          ? "resubscribe_required"
          : "pending",
    ...(signupUrl ? { signupUrl } : {}),
  };
}

/** Durable lease prevents concurrent verification, cron and ADMIN requests doing the same work. */
export async function processRegistrationNewsletter(userId: string) {
  if (!registrationNewsletterEnabled()) {
    return;
  }
  const now = new Date();
  const claimed = await prisma.registrationNewsletter.updateMany({
    where: {
      userId,
      status: { in: ACTIVE_WORK },
      verifiedAt: { not: null },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    data: { leaseUntil: new Date(now.getTime() + 120_000), attempts: { increment: 1 } },
  });
  if (!claimed.count) {
    return;
  }
  try {
    const config = newsletterGiftConfiguration();
    if (!config.ready || !config.listUrl || !config.listId) {
      throw Error("Configuration unavailable");
    }
    const record = await prisma.registrationNewsletter.findUnique({
      where: { userId },
      include: { user: { select: { email: true, emailVerified: true } } },
    });
    if (
      !record?.verifiedAt ||
      !record.user.emailVerified ||
      record.source !== "registration" ||
      record.consentVersion !== REGISTRATION_NEWSLETTER_VERSION ||
      (record.listId && record.listId !== config.listId)
    ) {
      throw Error("Consent unavailable");
    }
    const email = record.user.email.trim().toLowerCase();
    if (!config.production && email !== previewEmailRecipient().toLowerCase()) {
      throw Error("Preview recipient mismatch");
    }
    // Verify the actual audience identity before making any change.
    await readNewsletterList(config);
    const headers = {
      Authorization: `Basic ${Buffer.from(`eyd:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
    const hash = createHash("md5").update(email).digest("hex");
    const members = `${config.listUrl}/members`;
    const memberUrl = `${members}/${hash}`;
    const call = (url: string, method = "GET", body?: unknown) => {
      return fetch(url, {
        method,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    };
    let response = await call(memberUrl);
    if (response.status === 404) {
      // POST never overwrites a concurrent unsubscribe, unlike an unconditional upsert.
      const created = await call(members, "POST", {
        email_address: email,
        status: "subscribed",
        tags: ["website", "website_registration"],
      });
      if (!created.ok && created.status !== 400) {
        throw Error("Subscribe unavailable");
      }
      response = await call(memberUrl);
    }
    if (!response.ok) {
      throw Error("Member unavailable");
    }
    let member = await response.json();
    if (
      member.id !== hash ||
      member.list_id !== config.listId ||
      member.email_address?.toLowerCase() !== email
    ) {
      throw Error("Member mismatch");
    }
    if (member.status === "pending" && !record.activatedAt) {
      // New registration consent plus verified ownership permits activation without another email.
      const activated = await call(memberUrl, "PATCH", { status: "subscribed" });
      if (!activated.ok) {
        throw Error("Activation unavailable");
      }
      response = await call(memberUrl);
      if (!response.ok) {
        throw Error("Member unavailable");
      }
      member = await response.json();
    }
    if (member.status !== "subscribed") {
      await prisma.registrationNewsletter.update({
        where: { userId },
        data: {
          status: "RESUBSCRIBE_REQUIRED",
          listId: config.listId,
          leaseUntil: null,
          lastError: null,
        },
      });
      return;
    }
    // Remember the first activation before delivery. Retries must not undo any later unsubscribe.
    await prisma.registrationNewsletter.update({
      where: { userId },
      data: { activatedAt: record.activatedAt || new Date(), listId: config.listId },
    });
    const tagged = await call(`${memberUrl}/tags`, "POST", {
      tags: [
        { name: "website", status: "active" },
        { name: "website_registration", status: "active" },
      ],
    });
    if (!tagged.ok) {
      throw Error("Tags unavailable");
    }
    const delivered = await processRegistrationNewsletterGift(userId, {
      email,
      listId: config.listId,
      memberId: member.unique_email_id,
    });
    if (delivered === "ignored") {
      // A just-added tag may not be visible yet. Re-read the member on retry;
      // a skipped gift alone does not prove an unsubscribe.
      throw Error("Member refresh required");
    }
    await prisma.registrationNewsletter.update({
      where: { userId },
      data: {
        status: delivered === "review-required" ? "REVIEW_REQUIRED" : "ACTIVE",
        leaseUntil: null,
        lastError: null,
      },
    });
  } catch {
    await prisma.registrationNewsletter.update({
      where: { userId },
      data: {
        status: "RETRY",
        leaseUntil: null,
        nextAttemptAt: new Date(Date.now() + 900_000),
        lastError: "Sincronización o entrega pendiente. Reintentar sin modificar bajas.",
      },
    });
  }
}

export async function processRegistrationNewsletterBatch() {
  if (!registrationNewsletterEnabled()) {
    return { processed: 0 };
  }
  const now = new Date();
  const records = await prisma.registrationNewsletter.findMany({
    where: {
      status: { in: ACTIVE_WORK },
      nextAttemptAt: { lte: now },
      verifiedAt: { not: null },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    select: { userId: true },
    orderBy: { nextAttemptAt: "asc" },
    take: 3,
  });
  for (const record of records) {
    await processRegistrationNewsletter(record.userId);
  }
  return { processed: records.length };
}
