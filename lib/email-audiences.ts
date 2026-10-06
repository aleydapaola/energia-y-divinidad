import { EmailCampaignAudienceType } from "@prisma/client";
import { groq } from "next-sanity";

import { parseManualEmails } from "@/lib/email-recipients";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export interface EmailRecipientCandidate {
  userId: string | null;
  email: string;
  name: string | null;
}

export interface AudienceOption {
  id: string;
  name: string;
  count?: number;
}

export interface CommunicationAudienceOptions {
  courses: AudienceOption[];
  membershipTiers: AudienceOption[];
  events: AudienceOption[];
}

export interface ResolveAudienceInput {
  audienceType: EmailCampaignAudienceType;
  audienceId?: string | null;
  userIds?: string[];
  manualEmails?: string;
}

const allowsOperationalEmailWhere = {
  OR: [
    { emailPreferences: { is: null } },
    { emailPreferences: { is: { unsubscribedAllAt: null } } },
  ],
};

function dedupeRecipients(recipients: EmailRecipientCandidate[]) {
  const map = new Map<string, EmailRecipientCandidate>();

  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email || map.has(email)) {
      continue;
    }
    map.set(email, {
      ...recipient,
      email,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function getCommunicationAudienceOptions(): Promise<CommunicationAudienceOptions> {
  const [courses, membershipTiers, events] = await Promise.all([
    client.fetch<Array<{ _id: string; title: string }>>(groq`
      *[_type == "course"] | order(displayOrder asc, title asc) {
        _id,
        title
      }
    `),
    client.fetch<Array<{ _id: string; name: string }>>(groq`
      *[_type == "membershipTier"] | order(tierLevel asc, name asc) {
        _id,
        name
      }
    `),
    client.fetch<Array<{ _id: string; title: string; eventDate?: string }>>(groq`
      *[_type == "event"] | order(eventDate desc) {
        _id,
        title,
        eventDate
      }
    `),
  ]);

  const [courseCounts, tierCounts, eventCounts] = await Promise.all([
    prisma.entitlement.groupBy({
      by: ["resourceId"],
      where: { type: "COURSE", revoked: false },
      _count: { id: true },
    }),
    prisma.subscription.groupBy({
      by: ["membershipTierId"],
      where: { status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
      _count: { id: true },
    }),
    prisma.booking.groupBy({
      by: ["resourceId"],
      where: {
        bookingType: "EVENT",
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _count: { id: true },
    }),
  ]);

  const courseCountMap = new Map(courseCounts.map((item) => [item.resourceId, item._count.id]));
  const tierCountMap = new Map(tierCounts.map((item) => [item.membershipTierId, item._count.id]));
  const eventCountMap = new Map(eventCounts.map((item) => [item.resourceId, item._count.id]));

  return {
    courses: courses.map((course) => ({
      id: course._id,
      name: course.title,
      count: courseCountMap.get(course._id) ?? 0,
    })),
    membershipTiers: membershipTiers.map((tier) => ({
      id: tier._id,
      name: tier.name,
      count: tierCountMap.get(tier._id) ?? 0,
    })),
    events: events.map((event) => ({
      id: event._id,
      name: event.eventDate
        ? `${event.title} (${new Date(event.eventDate).toLocaleDateString("es-CO")})`
        : event.title,
      count: eventCountMap.get(event._id) ?? 0,
    })),
  };
}

export async function getAudienceName(input: ResolveAudienceInput) {
  if (input.audienceType === "MANUAL_EMAILS") {
    return "Direcciones de correo";
  }
  if (input.audienceType === "ALL_USERS") {
    return "Todos los usuarios verificados";
  }
  if (input.audienceType === "SELECTED_USERS") {
    return "Usuarios seleccionados";
  }

  const options = await getCommunicationAudienceOptions();

  if (input.audienceType === "COURSE") {
    return options.courses.find((course) => course.id === input.audienceId)?.name ?? "Curso";
  }
  if (input.audienceType === "MEMBERSHIP") {
    return (
      options.membershipTiers.find((tier) => tier.id === input.audienceId)?.name ?? "Membresía"
    );
  }
  if (input.audienceType === "EVENT") {
    return options.events.find((event) => event.id === input.audienceId)?.name ?? "Evento";
  }

  return "Audiencia";
}

export async function resolveEmailAudience(
  input: ResolveAudienceInput
): Promise<EmailRecipientCandidate[]> {
  if (input.audienceType === "MANUAL_EMAILS") {
    const emails = parseManualEmails(input.manualEmails ?? "");
    const users = await prisma.user.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        name: true,
        emailPreferences: { select: { unsubscribedAllAt: true } },
      },
    });
    const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

    return dedupeRecipients(
      emails.flatMap((email) => {
        const user = usersByEmail.get(email);
        if (user?.emailPreferences?.unsubscribedAllAt) {
          return [];
        }
        return [{ email, userId: user?.id ?? null, name: user?.name ?? null }];
      })
    );
  }
  if (
    input.audienceType !== "ALL_USERS" &&
    input.audienceType !== "SELECTED_USERS" &&
    !input.audienceId
  ) {
    return [];
  }

  if (input.audienceType === "ALL_USERS") {
    const users = await prisma.user.findMany({
      where: {
        emailVerified: { not: null },
        ...allowsOperationalEmailWhere,
      },
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    return dedupeRecipients(
      users.map((user) => ({ userId: user.id, email: user.email, name: user.name }))
    );
  }

  if (input.audienceType === "SELECTED_USERS") {
    const users = await prisma.user.findMany({
      where: {
        id: { in: input.userIds ?? [] },
        ...allowsOperationalEmailWhere,
      },
      select: { id: true, email: true, name: true },
    });
    return dedupeRecipients(
      users.map((user) => ({ userId: user.id, email: user.email, name: user.name }))
    );
  }

  if (input.audienceType === "COURSE") {
    const audienceId = input.audienceId;
    if (!audienceId) {
      return [];
    }

    const entitlements = await prisma.entitlement.findMany({
      where: {
        type: "COURSE",
        resourceId: audienceId,
        revoked: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        user: allowsOperationalEmailWhere,
      },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return dedupeRecipients(
      entitlements.map(({ user }) => ({ userId: user.id, email: user.email, name: user.name }))
    );
  }

  if (input.audienceType === "MEMBERSHIP") {
    const audienceId = input.audienceId;
    if (!audienceId) {
      return [];
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        membershipTierId: audienceId,
        status: "ACTIVE",
        currentPeriodEnd: { gt: new Date() },
        user: allowsOperationalEmailWhere,
      },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return dedupeRecipients(
      subscriptions.map(({ user }) => ({ userId: user.id, email: user.email, name: user.name }))
    );
  }

  if (input.audienceType === "EVENT") {
    const audienceId = input.audienceId;
    if (!audienceId) {
      return [];
    }

    const bookings = await prisma.booking.findMany({
      where: {
        bookingType: "EVENT",
        resourceId: audienceId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        user: allowsOperationalEmailWhere,
      },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return dedupeRecipients(
      bookings.map(({ user }) => ({ userId: user.id, email: user.email, name: user.name }))
    );
  }

  return [];
}
