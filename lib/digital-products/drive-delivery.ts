import { prisma } from "@/lib/prisma";

import { assertPrivateFolder, connectedDrive, driveFolderUrl } from "./drive-api";
import { driveConfig, driveEnvironment } from "./drive-config";

import type { Prisma } from "@prisma/client";

export const activeProductEntitlement = (userId: string, productId: string) => ({
  userId, type: "PRODUCT" as const, resourceId: productId, revoked: false,
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

/** Snapshot once at checkout, before either payment method. Never expose these fields publicly. */
export async function driveCheckoutSnapshot(productId: string, refs: string[]) {
  const { environment } = driveConfig();
  if (!refs.length || refs.length > 100 || refs.some((ref) => !/^[a-f0-9-]{36}$/.test(ref)) || new Set(refs).size !== refs.length) {
    throw new Error("Este producto aún no tiene sus archivos privados preparados.");
  }
  const folder = await prisma.productDriveFolder.findUnique({
    where: { environment_productId: { environment, productId } },
    include: { uploads: { where: { id: { in: refs }, verifiedAt: { not: null } }, select: { id: true } } },
  });
  if (!folder || folder.uploads.length !== refs.length) { throw new Error("Los archivos de este producto requieren revisión antes de cobrar."); }
  return { environment, folderId: folder.folderId };
}

export function driveDeliveryForProduct(db: Prisma.TransactionClient, orderId: string, productId?: string) {
  return productId
    ? db.driveProductDelivery.findFirst({ where: { orderProduct: { orderId, productId } } })
    : db.driveProductDelivery.findUnique({ where: { orderId } });
}

export function retainedDriveReader(
  db: Prisma.TransactionClient, delivery: { environment: string; folderId: string; recipientEmail: string },
  orderId: string, productId: string
) {
  const validOrder = {
    id: { not: orderId },
    paymentStatus: "COMPLETED" as const,
    entitlements: { some: { type: "PRODUCT" as const, resourceId: productId, revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
  };
  return db.driveProductDelivery.findFirst({ where: {
    environment: delivery.environment, folderId: delivery.folderId, recipientEmail: delivery.recipientEmail,
    status: { in: ["GRANTED", "PENDING_ACCESS"] },
    OR: [{ order: validOrder }, { orderProduct: { productId, order: validOrder } }],
  } });
}

export async function ownedDriveAccess(orderId: string, userId: string, productId?: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId, orderType: "PRODUCT", paymentStatus: "COMPLETED" },
    include: { user: { select: { email: true, emailVerified: true } } } });
  if (!order?.user?.emailVerified) { return null; }
  const delivery = await driveDeliveryForProduct(prisma, orderId, productId);
  if (!delivery || delivery.environment !== driveEnvironment() || delivery.status !== "GRANTED") { return null; }
  if (order.user.email?.trim().toLowerCase() !== delivery.recipientEmail) { return null; }
  const entitlement = await prisma.entitlement.findFirst({ where: { ...activeProductEntitlement(userId, productId ?? order.itemId), orderId } });
  return entitlement ? driveFolderUrl(delivery.folderId) : null;
}

export async function administerDriveDelivery(orderId: string, actor: { id: string; email: string }, input: {
  action: "grant" | "refund" | "revoke"; revision: number; reference?: string; productId?: string;
}) {
  if (input.action === "grant") { throw new Error("La entrega se confirma automáticamente con el correo verificado del titular."); }
  const environment = driveEnvironment();
  const snapshot = await prisma.order.findUnique({ where: { id: orderId } });
  const delivery = await driveDeliveryForProduct(prisma, orderId, input.productId);
  if (!snapshot || !delivery || delivery.environment !== environment || snapshot.orderType !== "PRODUCT" || delivery.revision !== input.revision) {
    throw new Error("El pedido ha cambiado. Recarga antes de continuar.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fulfillment:${orderId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-folder-acl:${delivery.folderId}`}))`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    const current = await driveDeliveryForProduct(tx, orderId, input.productId);
    if (!order || !current || current.revision !== input.revision) { throw new Error("El pedido ha cambiado. Recarga antes de continuar."); }
    if (input.action === "revoke") {
      const drive = await connectedDrive();
      await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
      const permissions = await assertPrivateFolder(current.folderId, drive);
      const hasReader = permissions.some((p) => p.type === "user" && p.role === "reader" && p.emailAddress?.toLowerCase() === current.recipientEmail);
      if (hasReader) {
        const anotherPurchase = await retainedDriveReader(tx, current, orderId, input.productId ?? order.itemId);
        if (!anotherPurchase) { throw new Error("Retira primero el permiso de esta cuenta en Drive. Ocultar el enlace en la web no revoca el permiso."); }
      }
    }
    let change: Prisma.DriveProductDeliveryUpdateInput;
    if (input.action === "refund") {
      if (order.paymentStatus !== "COMPLETED" || !input.reference) { throw new Error("Registra solo un reembolso total ya realizado y verificado, con su referencia."); }
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
      await tx.entitlement.updateMany({ where: { orderId, type: "PRODUCT" }, data: { revoked: true, revokedAt: new Date(), revokedReason: "Reembolso total verificado por administración" } });
      await tx.driveProductDelivery.updateMany({
        where: { OR: [{ orderId }, { orderProduct: { orderId } }] },
        data: { status: "PENDING_REVOCATION", pendingRecipientEmail: null, revision: { increment: 1 } },
      });
      change = {};
    } else {
      if (current.status !== "PENDING_REVOCATION") { throw new Error("No hay una retirada pendiente de comprobar."); }
      change = order.paymentStatus === "COMPLETED" && current.pendingRecipientEmail
        ? { recipientEmail: current.pendingRecipientEmail, pendingRecipientEmail: null, status: "PENDING_ACCESS", grantedAt: null, grantedBy: null }
        : { status: "REVOKED", pendingRecipientEmail: null };
    }
    if (input.action === "revoke") {
      await tx.driveProductDelivery.update({ where: { id: current.id }, data: { ...change, revision: { increment: 1 } } });
    }
    await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityType: "order", entityId: orderId,
      action: `drive_${input.action}`, before: { status: current.status, recipientEmail: current.recipientEmail, paymentStatus: order.paymentStatus },
      after: { action: input.action }, reason: input.reference || null } });
  }, { maxWait: 10_000, timeout: 45_000 });
}
