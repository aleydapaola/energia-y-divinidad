import { activeCheckoutHoldWhere } from "@/lib/checkout/hold-store";

import type { Prisma } from "@prisma/client";

type SeatStore = Pick<Prisma.TransactionClient, "booking" | "seatAllocation" | "checkoutHold">;
type EventCapacity = { _id: string; capacity?: number | null };

export class EventCapacityError extends Error {
  readonly status = 409;
}

export function bookingSeatCount(metadata: unknown): number {
  const seats =
    metadata && typeof metadata === "object" && "seats" in metadata ? metadata.seats : 1;
  return typeof seats === "number" && Number.isSafeInteger(seats) && seats > 0 ? seats : 1;
}

/** Count legacy bookings too, without rewriting them or double-counting allocations. */
export async function eventSeatUsage(
  db: SeatStore,
  eventIds: string[],
  excludeBookingId?: string,
  excludeHoldOrderId?: string
) {
  const used = new Map(eventIds.map((id) => [id, 0]));
  if (!eventIds.length) {
    return used;
  }
  const [allocations, bookings] = await Promise.all([
    db.seatAllocation.findMany({
      where: { eventId: { in: eventIds }, status: "ACTIVE" },
      select: { bookingId: true, eventId: true, seats: true },
    }),
    db.booking.findMany({
      where: { bookingType: "EVENT", resourceId: { in: eventIds } },
      select: { id: true, resourceId: true, status: true, metadata: true },
    }),
  ]);
  const cancelled = new Set(bookings.filter((b) => b.status === "CANCELLED").map((b) => b.id));
  const allocated = new Set<string>();
  for (const allocation of allocations) {
    if (allocation.bookingId === excludeBookingId || cancelled.has(allocation.bookingId)) {
      continue;
    }
    allocated.add(allocation.bookingId);
    used.set(allocation.eventId, (used.get(allocation.eventId) || 0) + allocation.seats);
  }
  for (const booking of bookings) {
    if (booking.id === excludeBookingId || cancelled.has(booking.id) || allocated.has(booking.id)) {
      continue;
    }
    used.set(
      booking.resourceId,
      (used.get(booking.resourceId) || 0) + bookingSeatCount(booking.metadata)
    );
  }
  const holds = await db.checkoutHold.findMany({
    where: {
      ...activeCheckoutHoldWhere(excludeHoldOrderId),
      orderType: "EVENT",
      resourceId: { in: eventIds },
    },
    select: { resourceId: true, seats: true },
  });
  for (const hold of holds) {
    used.set(hold.resourceId, (used.get(hold.resourceId) || 0) + hold.seats);
  }
  return used;
}

export async function withEventAvailability<T extends EventCapacity>(db: SeatStore, events: T[]) {
  const usage = await eventSeatUsage(
    db,
    events.filter((e) => e.capacity).map((e) => e._id)
  );
  return events.map((event) => ({
    ...event,
    availableSpots: event.capacity
      ? Math.max(0, event.capacity - (usage.get(event._id) || 0))
      : undefined,
  }));
}

/** All event allocation writers take the same transaction-scoped lock. */
export async function lockEventCapacity(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`eyd:event-capacity:${eventId}`}))`;
}

export async function assertEventCapacity(
  db: SeatStore,
  event: EventCapacity,
  seats: number,
  excludeBookingId?: string,
  excludeHoldOrderId?: string
) {
  if (!Number.isSafeInteger(seats) || seats < 1) {
    throw new EventCapacityError("Número de plazas inválido.");
  }
  if (!event.capacity) {
    return;
  }
  const usage = await eventSeatUsage(db, [event._id], excludeBookingId, excludeHoldOrderId);
  if ((usage.get(event._id) || 0) + seats > event.capacity) {
    throw new EventCapacityError(
      "No quedan suficientes plazas para este evento. No repitas el pago."
    );
  }
}
