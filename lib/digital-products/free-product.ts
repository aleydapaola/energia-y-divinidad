import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

import {
  assertPrivateFolder,
  assertPrivatePermissions,
  connectedDrive,
  driveFetch,
  drivePermissions,
  validDriveId,
  type DriveFile,
} from "./drive-api";
import { driveEnvironment } from "./drive-config";
import { applyDriveFilePolicy } from "./drive-file-policy";

export type FreeFile = { key: string; title: string; contentType: string };
type EditorialFile = {
  _key: string;
  title?: string;
  internalFileRef?: string;
  contentType?: string;
};
const formats = new Set([
  "application/pdf",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a", // Chrome/macOS reports this MIME for M4A uploads.
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Only explicitly published free products. Never expose Drive IDs or private manifests. */
function freeProduct(productId: string) {
  return client.fetch<{ _id: string; privateDigitalFiles: EditorialFile[] } | null>(
    `*[_type == "product" && _id == $id && published == true && status == "active" && pricing.isFree == true && digitalDeliveryVersion == 2 && productType in ["digital","ebook","audio","course"]][0]{_id,privateDigitalFiles[]{_key,title,internalFileRef,contentType}}`,
    { id: productId },
    { cache: "no-store" }
  );
}

async function isolatedFreeFolder(productId: string) {
  // Editorial mistakes must never publish bytes from a folder associated with a sale.
  if (
    await prisma.order.findFirst({
      where: { orderType: "PRODUCT", itemId: productId },
      select: { id: true },
    })
  ) {
    return null;
  }
  return prisma.productDriveFolder.findUnique({
    where: { environment_productId: { environment: driveEnvironment(), productId } },
  });
}

export async function freeProductFiles(productId: string): Promise<FreeFile[]> {
  const product = await freeProduct(productId);
  if (!product || !(await isolatedFreeFolder(productId))) {
    return [];
  }
  const uploads = await prisma.productDriveUpload.findMany({
    where: {
      folder: { productId, environment: driveEnvironment() },
      verifiedAt: { not: null },
    },
    select: { id: true, contentType: true },
  });
  return (product.privateDigitalFiles || []).flatMap((file) => {
    const verified = uploads.find(
      (upload) => upload.id === file.internalFileRef && upload.contentType === file.contentType
    );
    return verified && formats.has(verified.contentType)
      ? [
          {
            key: file._key,
            title: file.title || "Contenido gratuito",
            contentType: verified.contentType,
          },
        ]
      : [];
  });
}

export function freeContentRange(value: string | null, size: number) {
  if (!value) {
    return null;
  }
  const match = /^bytes=(\d{1,12})-(\d{0,12})$/.exec(value);
  if (!match) {
    throw new Error("RANGE");
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (start >= size || end < start) {
    throw new Error("RANGE");
  }
  return `bytes=${start}-${Math.min(end, size - 1)}`;
}

export async function freeProductContent(request: Request, productId: string, key: string) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  const fail = (status: number) =>
    new Response(
      request.method === "HEAD" ? null : "Contenido disponible solo para consulta en línea.",
      { status, headers }
    );
  if (new URL(request.url).searchParams.has("download")) {
    return fail(403);
  }
  const product = await freeProduct(productId);
  const file = product?.privateDigitalFiles?.find((entry) => entry._key === key);
  if (!file?.internalFileRef || !(await isolatedFreeFolder(productId))) {
    return fail(404);
  }
  const upload = await prisma.productDriveUpload.findFirst({
    where: {
      id: file.internalFileRef,
      verifiedAt: { not: null },
      folder: { productId, environment: driveEnvironment() },
    },
    include: { folder: true },
  });
  if (!upload || upload.contentType !== file.contentType || !formats.has(upload.contentType)) {
    return fail(404);
  }
  let range: string | null;
  try {
    range = freeContentRange(request.headers.get("range"), upload.size);
  } catch {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${upload.size}` },
    });
  }
  try {
    const drive = await connectedDrive();
    await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
    const permissions = await assertPrivateFolder(upload.folder.folderId, drive);
    assertPrivatePermissions(permissions, drive.connection.ownerPermissionId, []);
    const metadata = (await driveFetch(
      `files/${validDriveId(upload.fileId)}?fields=id,size,sha256Checksum,mimeType,parents,trashed,owners(permissionId)`,
      drive.accessToken
    )) as DriveFile;
    if (
      metadata.trashed ||
      metadata.mimeType !== upload.contentType ||
      Number(metadata.size) !== upload.size ||
      metadata.sha256Checksum !== upload.sha256 ||
      metadata.parents?.length !== 1 ||
      metadata.parents[0] !== upload.folder.folderId ||
      !metadata.owners?.some((owner) => owner.permissionId === drive.connection.ownerPermissionId)
    ) {
      return fail(503);
    }
    assertPrivatePermissions(
      await drivePermissions(upload.fileId, drive.accessToken),
      drive.connection.ownerPermissionId,
      []
    );
    await applyDriveFilePolicy(
      upload.fileId,
      upload.contentType,
      "FREE_ONLINE",
      drive.accessToken,
      { folderId: upload.folder.folderId, ownerId: drive.connection.ownerPermissionId }
    );
    const upstream = await fetch(
      `https://www.googleapis.com/drive/v3/files/${validDriveId(upload.fileId)}?alt=media`,
      {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(45_000),
        headers: {
          Authorization: `Bearer ${drive.accessToken}`,
          ...(range ? { Range: range } : {}),
        },
      }
    );
    if (![200, 206].includes(upstream.status) || (range && upstream.status !== 206)) {
      await upstream.body?.cancel();
      return fail(503);
    }
    const responseHeaders = new Headers({
      ...headers,
      "Content-Type": upload.contentType,
      "Content-Disposition": "inline",
      "Accept-Ranges": "bytes",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    const contentRange = upstream.headers.get("content-range");
    if (upstream.status === 206) {
      if (!contentRange || !/^bytes \d+-\d+\/\d+$/.test(contentRange)) {
        await upstream.body?.cancel();
        return fail(503);
      }
      responseHeaders.set("Content-Range", contentRange);
    }
    const length = upstream.headers.get("content-length");
    if (length && /^\d+$/.test(length)) {
      responseHeaders.set("Content-Length", length);
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return fail(503);
  }
}
