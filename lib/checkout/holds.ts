import { CHECKOUT_HOLD_MINUTES } from "@/lib/checkout/hold-store";
import { assertEventCapacity, lockEventCapacity } from "@/lib/events/capacity";
import { prisma } from "@/lib/prisma";
import { getEventById } from "@/lib/sanity/queries/events";
import { assertSessionTimeAvailable, schedulingConfig } from "@/lib/session-scheduling";

import type { Prisma, PrismaClient } from "@prisma/client";

type Resource = { orderType: string; itemId: string; metadata?: unknown };
export class CheckoutHoldError extends Error {
  readonly status = 409;
}

function inventory(order: Resource) {
  const metadata = (order.metadata || {}) as Record<string, unknown>;
  if (order.orderType === "SESSION" && metadata.productType !== "pack" && metadata.scheduledAt) {
    return {
      orderType: "SESSION" as const,
      resourceId: order.itemId,
      scheduledAt: new Date(String(metadata.scheduledAt)),
      seats: 1,
    };
  }
  if (order.orderType === "EVENT") {
    return {
      orderType: "EVENT" as const,
      resourceId: order.itemId,
      scheduledAt: null,
      seats: typeof metadata.seats === "number" ? metadata.seats : 1,
    };
  }
  return null;
}

export async function lockCheckoutInventory(tx: Prisma.TransactionClient, order: Resource) {
  const resource = inventory(order);
  if (resource?.orderType === "SESSION") {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"eyd:session-calendar"}))`;
  } else if (resource?.orderType === "EVENT") {
    await lockEventCapacity(tx, resource.resourceId);
  }
}

async function withInventory<T>(
  order: Resource,
  operation: (
    tx: Prisma.TransactionClient,
    resource: ReturnType<typeof inventory>,
    duration: number | null
  ) => Promise<T>,
  options: { db?: PrismaClient; capacity?: number | null; excludeOrderId?: string } = {}
) {
  const resource = inventory(order);
  const config = resource?.orderType === "SESSION" ? await schedulingConfig() : null;
  const event =
    resource?.orderType === "EVENT"
      ? options.capacity !== undefined
        ? { _id: resource.resourceId, capacity: options.capacity }
        : await getEventById(resource.resourceId)
      : null;
  if (
    resource?.orderType === "EVENT" &&
    (!event || ("status" in event && event.status === "cancelled"))
  ) {
    throw new CheckoutHoldError("El evento no está disponible. No realices el pago.");
  }
  return (options.db ?? prisma).$transaction(
    async (tx) => {
      await lockCheckoutInventory(tx, order);
      let duration: number | null = null;
      if (resource?.orderType === "SESSION" && config && resource.scheduledAt) {
        duration = await assertSessionTimeAvailable(tx, config, resource.scheduledAt, {
          excludeHoldOrderId: options.excludeOrderId,
        });
      } else if (resource?.orderType === "EVENT" && event) {
        await assertEventCapacity(tx, event, resource.seats, undefined, options.excludeOrderId);
      }
      return operation(tx, resource, duration);
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

/** Order + inventory claim are committed together, before exposing payment instructions. */
export async function createHeldCheckoutOrder(
  data: Prisma.OrderUncheckedCreateInput,
  capacity?: number | null,
  db: PrismaClient = prisma
) {
  return withInventory(
    data,
    async (tx, resource, duration) => {
      const order = await tx.order.create({ data, include: { user: true } });
      if (resource) {
        await tx.checkoutHold.create({
          data: {
            orderId: order.id,
            ...resource,
            duration,
            expiresAt: new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60000),
          },
        });
      }
      return order;
    },
    { db, capacity }
  );
}

/** Capture/report becomes a non-expiring claim before touching the payment provider.
 * Only the atomic delivery or a reviewed release can free an uncertain payment. */
export async function protectCheckoutPayment(
  orderId: string,
  state: "CAPTURING" | "REPORTED",
  options: { allowExpired?: boolean; db?: PrismaClient } = {}
) {
  const db = options.db ?? prisma;
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { checkoutHold: true },
  });
  if (!inventory(order)) {
    return;
  }
  // Existing paid booking: delivery is already committed, so don't claim it twice.
  if (order.checkoutHold?.state === "CONSUMED" || order.checkoutHold?.state === state) {
    return;
  }
  return withInventory(
    order,
    async (tx, resource, duration) => {
      const hold = await tx.checkoutHold.findUnique({ where: { orderId } });
      if (hold?.state === "CONSUMED") {
        return;
      }
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (!["PENDING", "PROCESSING", "COMPLETED"].includes(current.paymentStatus)) {
        throw new CheckoutHoldError("Este pedido no admite pagos. No realices otra transferencia.");
      }
      if (
        hold &&
        !options.allowExpired &&
        (hold.state === "RELEASED" ||
          (hold.state === "HELD" && hold.expiresAt.getTime() <= Date.now()))
      ) {
        throw new CheckoutHoldError(
          "La reserva temporal ha caducado. No se ha iniciado el cobro. Vuelve a elegir hora o plaza."
        );
      }
      await tx.checkoutHold.upsert({
        where: { orderId },
        create: {
          orderId,
          ...resource!,
          duration,
          state,
          expiresAt: new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60000),
        },
        update: { state, duration },
      });
    },
    { db, excludeOrderId: orderId }
  );
}

/** Safe only before a capture starts; never release CAPTURING/REPORTED on a timeout. */
export async function releaseUnpaidCheckoutHold(orderId: string) {
  await prisma.checkoutHold.updateMany({
    where: { orderId, state: "HELD" },
    data: { state: "RELEASED" },
  });
}
