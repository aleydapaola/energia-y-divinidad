import { prisma } from "@/lib/prisma";

import { assertPrivateFolder, assertPrivatePermissions, connectedDrive, driveFetch, drivePermissions, validDriveId, type DrivePermission } from "./drive-api";
import { driveEnvironment } from "./drive-config";
import { activeProductEntitlement } from "./drive-delivery";
import { applyDriveFilePolicy } from "./drive-file-policy";

type DeliveryResult = { delivered: boolean; reason?: "PAYMENT_PENDING" | "IDENTITY_UNVERIFIED" | "REVIEW_REQUIRED" | "DRIVE_UNAVAILABLE" | "NOT_FOUND" };

/** A delivery retry never captures, confirms or changes payment. No email/folder parameters. */
export async function deliverPaidDriveOrder(orderId: string, requestingUserId?: string): Promise<DeliveryResult> {
  try {
    const environment = driveEnvironment();
    const candidate = await prisma.order.findUnique({ where: { id: orderId }, include: { driveDelivery: true } });
    if (!candidate?.driveDelivery || candidate.orderType !== "PRODUCT" || candidate.driveDelivery.environment !== environment ||
        (requestingUserId && candidate.userId !== requestingUserId)) { return { delivered: false, reason: "NOT_FOUND" }; }
    if (candidate.paymentStatus !== "COMPLETED") { return { delivered: false, reason: "PAYMENT_PENDING" }; }
    const folderId = candidate.driveDelivery.folderId;
    return await prisma.$transaction(async (tx) => {
      // Drive does not support concurrent permission changes on one file. Serialize per folder,
      // including different paid orders for the same product, and list before every create.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-folder-acl:${folderId}`}))`;
      const order = await tx.order.findUnique({ where: { id: orderId }, include: {
        driveDelivery: true, user: { select: { id: true, email: true, emailVerified: true } },
      } });
      const delivery = order?.driveDelivery;
      if (!order || !delivery || !order.userId || (requestingUserId && order.userId !== requestingUserId) ||
          delivery.environment !== environment || delivery.folderId !== folderId) { return { delivered: false, reason: "NOT_FOUND" as const }; }
      if (order.paymentStatus !== "COMPLETED") { return { delivered: false, reason: "PAYMENT_PENDING" as const }; }
      const email = order.user?.email?.trim().toLowerCase();
      if (!email || !order.user?.emailVerified || order.user.id !== order.userId) {
        return { delivered: false, reason: "IDENTITY_UNVERIFIED" as const };
      }
      if (!["PENDING_ACCESS", "GRANTED"].includes(delivery.status) || delivery.recipientEmail !== email ||
          !await tx.entitlement.findFirst({ where: { ...activeProductEntitlement(order.userId, order.itemId), orderId } }) ||
          !await tx.productDriveFolder.findFirst({ where: { environment, productId: order.itemId, folderId: delivery.folderId } })) {
        return { delivered: false, reason: "REVIEW_REQUIRED" as const };
      }
      const drive = await connectedDrive();
      if (delivery.folderId === drive.connection.rootFolderId || email === drive.ownerEmail) {
        return { delivered: false, reason: "REVIEW_REQUIRED" as const };
      }
      await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
      const readers = await assertPrivateFolder(delivery.folderId, drive);
      const files = await tx.productDriveUpload.findMany({ where: { verifiedAt: { not: null },
        folder: { environment, productId: order.itemId, folderId: delivery.folderId } }, select: { fileId: true, contentType: true } });
      if (!files.length) { return { delivered: false, reason: "REVIEW_REQUIRED" as const }; }
      for (const file of files) {
        assertPrivatePermissions(await drivePermissions(file.fileId, drive.accessToken), drive.connection.ownerPermissionId,
          readers.filter((p) => p.role === "reader").map((p) => (p.emailAddress || "").toLowerCase()));
        // Apply only to the verified files belonging to this product, before confirming delivery.
        await applyDriveFilePolicy(file.fileId, file.contentType, "PAID_DOWNLOAD", drive.accessToken,
          { folderId: delivery.folderId, ownerId: drive.connection.ownerPermissionId });
      }
      let permission = (await drivePermissions(delivery.folderId, drive.accessToken)).find((p) =>
        !p.deleted && p.type === "user" && p.emailAddress?.toLowerCase() === email);
      if (permission && permission.role !== "reader") { return { delivered: false, reason: "REVIEW_REQUIRED" as const }; }
      if (!permission) {
        permission = await driveFetch(`files/${validDriveId(delivery.folderId)}/permissions?sendNotificationEmail=false&fields=id,type,role,emailAddress`, drive.accessToken, {
          method: "POST", body: JSON.stringify({ type: "user", role: "reader", emailAddress: email }),
        }) as DrivePermission;
      }
      if (!permission.id) { throw new Error("Drive did not confirm a permission ID."); }
      const confirmed = await driveFetch(`files/${validDriveId(delivery.folderId)}/permissions/${encodeURIComponent(permission.id)}?fields=id,type,role,emailAddress,deleted`, drive.accessToken) as DrivePermission;
      if (confirmed.deleted || confirmed.type !== "user" || confirmed.role !== "reader" || confirmed.emailAddress?.toLowerCase() !== email) {
        throw new Error("Drive did not confirm this buyer's reader permission.");
      }
      if (delivery.status === "GRANTED") { return { delivered: true }; }
      await tx.driveProductDelivery.update({ where: { orderId }, data: {
        status: "GRANTED", grantedAt: new Date(), grantedBy: "DRIVE_API", pendingRecipientEmail: null, revision: { increment: 1 },
      } });
      await tx.auditLog.create({ data: { actorId: order.userId, actorEmail: email, entityType: "order", entityId: orderId,
        action: "drive_auto_grant", before: { status: delivery.status }, after: { status: "GRANTED", role: "reader" } } });
      return { delivered: true };
    }, { maxWait: 10_000, timeout: 45_000 });
  } catch {
    // Permission may already exist if a response/DB commit was lost. Next retry lists first.
    // No payment update, provider call, raw OAuth error, token or folder URL here.
    return { delivered: false, reason: "DRIVE_UNAVAILABLE" };
  }
}
