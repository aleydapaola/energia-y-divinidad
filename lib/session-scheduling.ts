import { prisma } from "@/lib/prisma";
import { getSessionConfig } from "@/lib/sanity/queries/sessionConfig";

import {
  buildSessionSlots,
  colombiaDateKey,
  SESSION_BLOCKING_STATUSES,
  sessionBuffer,
  sessionDuration,
  sessionIntervalsConflict,
  validSessionDate,
  type SessionSchedule,
} from "./session-slots";

import type { Prisma, PrismaClient } from "@prisma/client";

export class SessionSchedulingError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

export async function schedulingConfig(): Promise<SessionSchedule> {
  const config = await getSessionConfig();
  if (!config) {
    throw new SessionSchedulingError("La agenda no está disponible. Inténtalo más tarde.", 503);
  }
  return config;
}

/** All participating session writers share this transaction-scoped calendar lock. No network I/O inside. */
export async function withSessionCalendar<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  db: PrismaClient = prisma
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"eyd:session-calendar"}))`;
      return operation(tx);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

export async function occupiedSessionIntervals(
  reader: Pick<Prisma.TransactionClient, "booking">,
  through: Date,
  excludeBookingId?: string
) {
  // No lower date bound: a long/legacy appointment can overlap the next Colombia day.
  return reader.booking.findMany({
    where: {
      bookingType: "SESSION_1_ON_1",
      status: { in: [...SESSION_BLOCKING_STATUSES] },
      scheduledAt: { not: null, lt: through },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { scheduledAt: true, duration: true },
  });
}

export async function sessionAvailability(
  date: string,
  options: {
    reader?: Pick<Prisma.TransactionClient, "booking">;
    config?: SessionSchedule;
    excludeBookingId?: string;
    duration?: number;
  } = {}
) {
  if (!validSessionDate(date)) {
    throw new SessionSchedulingError("Fecha inválida. Usa YYYY-MM-DD", 400);
  }
  const config = options.config ?? (await schedulingConfig());
  const end = new Date(`${date}T00:00:00-05:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setTime(end.getTime() + sessionBuffer(config) * 60000);
  const occupied = await occupiedSessionIntervals(
    options.reader ?? prisma,
    end,
    options.excludeBookingId
  );
  return {
    ...buildSessionSlots(date, config, occupied, { duration: options.duration }),
    session: {
      title: config.title,
      duration: sessionDuration(options.duration, config),
      leadTime: config.bookingLeadTime,
    },
  };
}

export async function assertSessionTimeAvailable(
  tx: Pick<Prisma.TransactionClient, "booking">,
  config: SessionSchedule,
  start: Date,
  options: { duration?: number | null; excludeBookingId?: string; enforceSchedule?: boolean } = {}
) {
  if (
    !Number.isFinite(start.getTime()) ||
    start.getTime() <= Date.now() ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0
  ) {
    throw new SessionSchedulingError("Selecciona una fecha y hora futura válida.", 400);
  }
  const duration = sessionDuration(options.duration, config);
  const end = new Date(start.getTime() + (duration + sessionBuffer(config)) * 60000);
  const occupied = await occupiedSessionIntervals(tx, end, options.excludeBookingId);
  if (options.enforceSchedule !== false) {
    const slots = buildSessionSlots(colombiaDateKey(start), config, [], { duration });
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(start);
    if (!slots.slots.some((s) => s.time === time && s.available)) {
      throw new SessionSchedulingError(
        "La hora seleccionada no está disponible en la agenda. Elige otra franja."
      );
    }
  }
  if (occupied.some((b) => sessionIntervalsConflict(start, duration, b, config))) {
    throw new SessionSchedulingError("Este horario ya no está disponible. Elige otra franja.");
  }
  return duration;
}

export async function moveSessionBooking(
  input: { id: string; actorId: string; newDate: Date; reason?: string; requireAdmin?: boolean },
  options: { db?: PrismaClient; config?: SessionSchedule } = {}
) {
  const config = options.config ?? (await schedulingConfig());
  return withSessionCalendar(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.actorId },
      select: { id: true, role: true, email: true },
    });
    if (!actor) {
      throw new SessionSchedulingError("No autorizado", 401);
    }
    const isAdmin = actor.role === "ADMIN";
    if (input.requireAdmin && !isAdmin) {
      throw new SessionSchedulingError("No autorizado", 403);
    }
    const before = await tx.booking.findUnique({
      where: { id: input.id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!before) {
      throw new SessionSchedulingError("Reserva no encontrada", 404);
    }
    if (!isAdmin && before.userId !== actor.id) {
      throw new SessionSchedulingError("No tienes permiso para reprogramar esta sesión", 403);
    }
    if (before.bookingType !== "SESSION_1_ON_1" || (before.sessionsTotal ?? 1) > 1) {
      throw new SessionSchedulingError(
        "Esta acción solo está disponible para sesiones individuales",
        400
      );
    }
    if (!["CONFIRMED", "PENDING"].includes(before.status)) {
      throw new SessionSchedulingError("No se puede reprogramar una sesión con este estado", 400);
    }
    if (before.scheduledAt?.getTime() === input.newDate.getTime()) {
      throw new SessionSchedulingError("Esta ya es la fecha actual de la sesión.", 400);
    }
    if (!isAdmin) {
      if (!before.scheduledAt && before.status !== "CONFIRMED") {
        throw new SessionSchedulingError(
          "La sesión debe estar confirmada antes de elegir fecha",
          400
        );
      }
      if (before.scheduledAt && before.rescheduleCount >= 2) {
        throw new SessionSchedulingError(
          "Has alcanzado el límite de 2 reprogramaciones. Contacta con Aleyda para más cambios.",
          400
        );
      }
      if (before.scheduledAt && before.scheduledAt.getTime() - Date.now() < 24 * 3600000) {
        throw new SessionSchedulingError(
          "Las reprogramaciones deben hacerse con al menos 24 horas de anticipación",
          400
        );
      }
    }
    const duration = await assertSessionTimeAvailable(tx, config, input.newDate, {
      duration: before.duration,
      excludeBookingId: before.id,
      enforceSchedule: !isAdmin,
    });
    // Re-read under the calendar lock above; the count and current date cannot be stale between two moves.
    const changed = await tx.booking.updateMany({
      where: {
        id: before.id,
        status: before.status,
        scheduledAt: before.scheduledAt,
        rescheduleCount: before.rescheduleCount,
      },
      data: {
        previousScheduledAt: before.scheduledAt,
        scheduledAt: input.newDate,
        duration,
        rescheduledAt: new Date(),
        rescheduledBy: isAdmin ? actor.id : null,
        ...(before.scheduledAt ? { rescheduleCount: { increment: 1 } } : {}),
        rescheduleReason: input.reason || null,
      },
    });
    if (changed.count !== 1) {
      throw new SessionSchedulingError(
        "La reserva ha cambiado. Recarga tus sesiones antes de reintentar."
      );
    }
    const updated = await tx.booking.findUniqueOrThrow({
      where: { id: before.id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (isAdmin) {
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          entityType: "booking",
          entityId: before.id,
          action: "reschedule",
          before: {
            scheduledAt: before.scheduledAt?.toISOString() ?? null,
            rescheduleCount: before.rescheduleCount,
            status: before.status,
          },
          after: {
            scheduledAt: updated.scheduledAt?.toISOString() ?? null,
            rescheduleCount: updated.rescheduleCount,
            status: updated.status,
          },
          reason: input.reason || null,
        },
      });
    }
    return { before, updated, isAdmin };
  }, options.db);
}
