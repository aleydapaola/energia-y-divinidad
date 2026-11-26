import { activeProductEntitlement } from "@/lib/digital-products/drive-delivery";
import { prisma } from "@/lib/prisma";

import type { PrivateProductFile } from "@/lib/digital-products/files";

export type LegacyProductFiles = {
  privateDigitalFiles?: PrivateProductFile[];
  digitalFiles?: {
    _key: string;
    title?: string;
    description?: string;
    asset?: { url?: string; originalFilename?: string };
  }[];
};

export async function ownedProductFiles(userId: string, productId: string) {
  const rights = await prisma.entitlement.findMany({
    where: {
      ...activeProductEntitlement(userId, productId),
      AND: [{ OR: [{ orderId: null }, { order: { paymentStatus: "COMPLETED" } }] }],
    },
    select: { orderId: true },
  });
  if (!rights.length) {
    return null;
  }
  const lines = await prisma.orderDigitalProduct.findMany({
    where: {
      productId, orderId: { in: rights.flatMap(({ orderId }) => orderId ? [orderId] : []) },
      order: { paymentStatus: "COMPLETED" },
    },
    select: { title: true, legacyFiles: true, orderId: true },
    orderBy: { order: { createdAt: "desc" } },
  });
  return {
    snapshots: lines.flatMap(({ title, legacyFiles }) => legacyFiles
      ? [{ title, files: legacyFiles as LegacyProductFiles }]
      : []),
    allowCatalogFiles: rights.some(({ orderId }) => !lines.some((line) => line.orderId === orderId)),
  };
}
