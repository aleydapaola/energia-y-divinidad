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

export async function ownedDriveAccess(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId, orderType: "PRODUCT", paymentStatus: "COMPLETED" },
    include: { driveDelivery: true, user: { select: { email: true, emailVerified: true } } } });
  if (!order?.driveDelivery || order.driveDelivery.environment !== driveEnvironment() || order.driveDelivery.status !== "GRANTED") { return null; }
  if (!order.user?.emailVerified || order.user.email?.trim().toLowerCase() !== order.driveDelivery.recipientEmail) { return null; }
  const entitlement = await prisma.entitlement.findFirst({ where: { ...activeProductEntitlement(userId, order.itemId), orderId } });
  return entitlement ? driveFolderUrl(order.driveDelivery.folderId) : null;
}

export async function administerDriveDelivery(orderId: string, actor: { id: string; email: string }, input: {
  action: "grant" | "refund" | "revoke"; revision: number; reference?: string;
}) {
  if (input.action === "grant") { throw new Error("La entrega se confirma automáticamente con el correo verificado del titular."); }
  const environment = driveEnvironment();
  const snapshot = await prisma.order.findUnique({ where: { id: orderId }, include: { driveDelivery: true } });
  const delivery = snapshot?.driveDelivery;
  if (!snapshot || !delivery || delivery.environment !== environment || snapshot.orderType !== "PRODUCT" || delivery.revision !== input.revision) {
    throw new Error("El pedido ha cambiado. Recarga antes de continuar.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-folder-acl:${delivery.folderId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-delivery:${orderId}`}))`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { driveDelivery: true } });
    const current = order?.driveDelivery;
    if (!order || !current || current.revision !== input.revision) { throw new Error("El pedido ha cambiado. Recarga antes de continuar."); }
    if (input.action === "revoke") {
      const drive = await connectedDrive();
      await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
      const permissions = await assertPrivateFolder(current.folderId, drive);
      const hasReader = permissions.some((p) => p.type === "user" && p.role === "reader" && p.emailAddress?.toLowerCase() === current.recipientEmail);
      if (hasReader) {
        const anotherPurchase = await tx.driveProductDelivery.findFirst({ where: {
          environment, folderId: current.folderId, recipientEmail: current.recipientEmail, orderId: { not: orderId }, status: { in: ["GRANTED", "PENDING_ACCESS"] },
          order: { paymentStatus: "COMPLETED", entitlements: { some: { type: "PRODUCT", resourceId: order.itemId, revoked: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
        } });
        if (!anotherPurchase) { throw new Error("Retira primero el permiso de esta cuenta en Drive. Ocultar el enlace en la web no revoca el permiso."); }
      }
    }
    let change: Prisma.DriveProductDeliveryUpdateInput;
    if (input.action === "refund") {
      if (order.paymentStatus !== "COMPLETED" || !input.reference) { throw new Error("Registra solo un reembolso total ya realizado y verificado, con su referencia."); }
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
      await tx.entitlement.updateMany({ where: { orderId, type: "PRODUCT" }, data: { revoked: true, revokedAt: new Date(), revokedReason: "Reembolso total verificado por administración" } });
      change = { status: "PENDING_REVOCATION", pendingRecipientEmail: null };
    } else {
      if (current.status !== "PENDING_REVOCATION") { throw new Error("No hay una retirada pendiente de comprobar."); }
      change = order.paymentStatus === "COMPLETED" && current.pendingRecipientEmail
        ? { recipientEmail: current.pendingRecipientEmail, pendingRecipientEmail: null, status: "PENDING_ACCESS", grantedAt: null, grantedBy: null }
        : { status: "REVOKED", pendingRecipientEmail: null };
    }
    await tx.driveProductDelivery.update({ where: { orderId }, data: { ...change, revision: { increment: 1 } } });
    await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityType: "order", entityId: orderId,
      action: `drive_${input.action}`, before: { status: current.status, recipientEmail: current.recipientEmail, paymentStatus: order.paymentStatus },
      after: { action: input.action }, reason: input.reference || null } });
  }, { maxWait: 10_000, timeout: 45_000 });
}
