
import { CAMPAIGN_PDF_LIMIT } from "@/lib/campaign-attachment";
import {
  assertPrivateFolder,
  assertPrivatePermissions,
  connectedDrive,
  driveFetch,
  validDriveId,
  type DriveFile,
} from "@/lib/digital-products/drive-api";
import {
  decryptDriveSecret,
  driveConfig,
  encryptDriveSecret,
} from "@/lib/digital-products/drive-config";
import { driveFileIntegrity, validUploadSession } from "@/lib/digital-products/drive-upload";
import { safeFilename } from "@/lib/digital-products/files";
import { prisma } from "@/lib/prisma";

import type { CampaignAttachment, Prisma } from "@prisma/client";

const PDF = "application/pdf";
const folderMime = "application/vnd.google-apps.folder";
type Drive = Awaited<ReturnType<typeof connectedDrive>>;

export const campaignAttachmentSelect = {
  id: true,
  filename: true,
  size: true,
  downloadUrl: true,
} as const;

function pdfDrive() {
  if (driveConfig().environment !== "preview") {
    throw new Error("La cuenta gratuita de Drive de Comunicaciones está autorizada en Preview.");
  }
  return connectedDrive();
}

async function availableSpace(drive: Drive, bytes: number) {
  const about = await driveFetch("about?fields=storageQuota(limit,usage)", drive.accessToken);
  const limit = Number(about.storageQuota?.limit);
  const used = Number(about.storageQuota?.usage);
  if (!Number.isSafeInteger(limit) || limit <= 0 || !Number.isSafeInteger(used) || used < 0) {
    throw new Error("No se pudo comprobar el espacio disponible en Google Drive.");
  }
  if (limit - used < bytes) {
    throw new Error("No queda espacio suficiente en Google Drive para este PDF.");
  }
}

async function reserveId(drive: Drive) {
  const ids = await driveFetch(
    "files/generateIds?count=1&space=drive&type=files",
    drive.accessToken
  );
  return validDriveId(ids.ids?.[0] ?? "");
}

async function fileInfo(drive: Drive, id: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${validDriveId(id)}?fields=id,name,mimeType,size,sha256Checksum,parents,trashed,owners(permissionId),webContentLink`,
    {
      headers: { Authorization: `Bearer ${drive.accessToken}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    }
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("No se pudo comprobar el archivo en Google Drive.");
  }
  return (await response.json()) as DriveFile & { webContentLink?: string };
}

function campaignFolder(drive: Drive) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`campaign-drive-folder:${drive.environment}`}))`;
    const existing = await tx.campaignDriveFolder.findUnique({
      where: { environment: drive.environment },
    });
    if (existing) {
      return existing;
    }
    return tx.campaignDriveFolder.create({
      data: { environment: drive.environment, fileId: await reserveId(drive) },
    });
  });
}

async function ensureFolder(drive: Drive) {
  const folder = await campaignFolder(drive);
  if (!(await fileInfo(drive, folder.fileId))) {
    try {
      await driveFetch("files?fields=id", drive.accessToken, {
        method: "POST",
        body: JSON.stringify({
          id: folder.fileId,
          name: "Energía y Divinidad · Comunicaciones · Preview",
          mimeType: folderMime,
        }),
      });
    } catch (error) {
      if (!(await fileInfo(drive, folder.fileId))) {
        throw error;
      }
    }
  }
  await assertPrivateFolder(folder.fileId, drive, true);
  return folder.fileId;
}

async function lockDraft(tx: Prisma.TransactionClient, campaignId: string) {
  const draft = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "email_campaigns" WHERE "id" = ${campaignId} AND "status" = 'DRAFT' FOR UPDATE
  `;
  if (!draft.length) {
    throw new Error("Guarda y abre un borrador para gestionar sus adjuntos.");
  }
}

async function attachmentInDraft(campaignId: string, id: string) {
  const attachment = await prisma.campaignAttachment.findFirst({
    where: { id, campaignId, removedAt: null, campaign: { status: "DRAFT" } },
  });
  if (!attachment) {
    throw new Error("Adjunto no disponible en el borrador.");
  }
  return attachment;
}

function publicDriveUrl(value: string | undefined) {
  const url = new URL(value ?? "");
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !["drive.google.com", "drive.usercontent.google.com", "docs.google.com"].includes(url.hostname)
  ) {
    throw new Error("Drive no confirmó un enlace de descarga.");
  }
  return url.toString();
}

async function verifyDownload(attachment: CampaignAttachment, drive: Drive, publish: boolean) {
  await assertPrivateFolder(attachment.folderId, drive, true);
  const file = await fileInfo(drive, attachment.fileId);
  if (
    !file ||
    file.mimeType !== PDF ||
    driveFileIntegrity(file, {
      size: attachment.size,
      sha256: attachment.sha256,
      folderId: attachment.folderId,
      ownerId: drive.connection.ownerPermissionId,
    }) !== "valid"
  ) {
    throw new Error("El PDF no está completo o ya no coincide con el adjunto.");
  }
  const readPermissions = (id: string) =>
    driveFetch(
      `files/${validDriveId(id)}/permissions?fields=nextPageToken,permissions(id,type,role,deleted,allowFileDiscovery)&pageSize=100`,
      drive.accessToken
    ) as Promise<{
      nextPageToken?: string;
      permissions?: {
        id: string;
        type: string;
        role: string;
        deleted?: boolean;
        allowFileDiscovery?: boolean;
      }[];
    }>;
  let page = await readPermissions(attachment.fileId);
  if (page.nextPageToken) {
    throw new Error("Revisa los permisos del PDF en Google Drive.");
  }
  const acl = page.permissions ?? [];
  assertPrivatePermissions(
    acl.filter((permission) => permission.type !== "anyone"),
    drive.connection.ownerPermissionId,
    []
  );
  if (publish && !acl.some((permission) => permission.type === "anyone")) {
    try {
      await driveFetch(`files/${validDriveId(attachment.fileId)}/permissions`, drive.accessToken, {
        method: "POST",
        body: JSON.stringify({ type: "anyone", role: "reader", allowFileDiscovery: false }),
      });
    } catch {
      // The permission may already have been applied by a parallel retry. Verify it below.
    }
    page = await readPermissions(attachment.fileId);
  }
  const permissions = page.permissions ?? [];
  assertPrivatePermissions(
    permissions.filter((permission) => permission.type !== "anyone"),
    drive.connection.ownerPermissionId,
    []
  );
  const linkReaders = permissions.filter((permission) => permission.type === "anyone");
  if (
    page.nextPageToken ||
    linkReaders.length !== 1 ||
    linkReaders.some(
      (permission) =>
        permission.deleted ||
        permission.role !== "reader" ||
        permission.allowFileDiscovery !== false
    )
  ) {
    throw new Error("El PDF debe permitir la descarga por enlace sin iniciar sesión.");
  }
  return publicDriveUrl((await fileInfo(drive, attachment.fileId))?.webContentLink);
}

export async function startCampaignAttachment(
  campaignId: string,
  input: { filename: string; size: number; sha256: string }
) {
  if (
    input.size < 1 ||
    input.size > CAMPAIGN_PDF_LIMIT ||
    !Number.isSafeInteger(input.size) ||
    !/\.pdf$/i.test(input.filename) ||
    !/^[a-f0-9]{64}$/.test(input.sha256)
  ) {
    throw new Error("Selecciona un PDF de hasta 10 MB.");
  }
  const draft = await prisma.emailCampaign.findFirst({
    where: { id: campaignId, status: "DRAFT" },
    select: { id: true },
  });
  if (!draft) {
    throw new Error("Guarda el borrador antes de adjuntar un PDF.");
  }
  const drive = await pdfDrive();
  const folderId = await ensureFolder(drive);
  const filename = safeFilename(input.filename);
  return prisma.$transaction(
    async (tx) => {
      await lockDraft(tx, campaignId);
      const key = { campaignId, sha256: input.sha256, filename };
      let attachment = await tx.campaignAttachment.findUnique({
        where: { campaignId_sha256_filename: key },
      });
      if (attachment?.folderId && attachment.folderId !== folderId) {
        throw new Error("El adjunto pertenece a una carpeta de Drive distinta.");
      }
      if (attachment?.removedAt) {
        attachment = await tx.campaignAttachment.update({
          where: { id: attachment.id },
          data: { removedAt: null },
        });
      }
      if (attachment?.downloadUrl) {
        return { id: attachment.id, complete: true };
      }
      if (attachment && (await fileInfo(drive, attachment.fileId))) {
        return { id: attachment.id, complete: true };
      }
      await availableSpace(drive, input.size);
      if (!attachment) {
        attachment = await tx.campaignAttachment.create({
          data: { ...key, folderId, fileId: await reserveId(drive), size: input.size },
        });
      }
      if (attachment.encryptedSession) {
        return {
          id: attachment.id,
          sessionUrl: validUploadSession(decryptDriveSecret(attachment.encryptedSession)),
          complete: false,
        };
      }
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          headers: {
            Authorization: `Bearer ${drive.accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": PDF,
            "X-Upload-Content-Length": String(input.size),
            Origin: drive.origin,
          },
          body: JSON.stringify({
            id: attachment.fileId,
            name: filename,
            mimeType: PDF,
            parents: [folderId],
            appProperties: {
              eydCampaignAttachment: attachment.id,
              eydEnvironment: drive.environment,
            },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) {
        throw new Error(
          "Drive no pudo iniciar la subida. Comprueba conexión y espacio disponible."
        );
      }
      const sessionUrl = validUploadSession(response.headers.get("Location") ?? "");
      await tx.campaignAttachment.update({
        where: { id: attachment.id },
        data: { encryptedSession: encryptDriveSecret(sessionUrl) },
      });
      return { id: attachment.id, sessionUrl, complete: false };
    },
    { timeout: 30_000 }
  );
}

export async function campaignAttachmentStatus(campaignId: string, id: string) {
  const attachment = await attachmentInDraft(campaignId, id);
  if (attachment.downloadUrl) {
    return { complete: true, offset: attachment.size };
  }
  if (!attachment.encryptedSession) {
    throw new Error("Selecciona el mismo PDF para reintentar la subida.");
  }
  const encryptedSession = attachment.encryptedSession;
  const response = await fetch(validUploadSession(decryptDriveSecret(encryptedSession)), {
    method: "PUT",
    cache: "no-store",
    redirect: "manual",
    headers: { "Content-Range": `bytes */${attachment.size}`, "Content-Length": "0" },
    signal: AbortSignal.timeout(5000),
  });
  if (response.ok) {
    return { complete: true, offset: attachment.size };
  }
  if (response.status === 404 || response.status === 410) {
    await prisma.campaignAttachment.updateMany({
      where: { id, encryptedSession, removedAt: null, campaign: { status: "DRAFT" } },
      data: { encryptedSession: null },
    });
    throw new Error("La sesión caducó. Selecciona el mismo PDF para reintentar sin duplicarlo.");
  }
  if (response.status !== 308) {
    throw new Error("Drive no confirmó el progreso de la subida. Puedes reintentar.");
  }
  const range = response.headers.get("Range")?.match(/^bytes=0-(\d+)$/);
  const offset = range ? Number(range[1]) + 1 : 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= attachment.size) {
    throw new Error("No se pudo verificar el progreso en Drive.");
  }
  return { complete: false, offset };
}

export async function finalizeCampaignAttachment(campaignId: string, id: string) {
  const drive = await pdfDrive();
  return prisma.$transaction(
    async (tx) => {
      await lockDraft(tx, campaignId);
      const attachment = await tx.campaignAttachment.findFirst({
        where: { id, campaignId, removedAt: null },
      });
      if (!attachment) {
        throw new Error("Adjunto no disponible en el borrador.");
      }
      const downloadUrl = await verifyDownload(attachment, drive, !attachment.downloadUrl);
      return tx.campaignAttachment.update({
        where: { id },
        data: { downloadUrl, encryptedSession: null },
        select: campaignAttachmentSelect,
      });
    },
    { timeout: 30_000 }
  );
}

export async function removeCampaignAttachment(campaignId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    await lockDraft(tx, campaignId);
    await tx.campaignAttachment.updateMany({
      where: { id, campaignId, removedAt: null },
      data: { removedAt: new Date() },
    });
  });
}

export async function campaignDownloads(campaignId: string) {
  const attachments = await prisma.campaignAttachment.findMany({
    where: { campaignId, removedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!attachments.length) {
    return [];
  }
  const drive = await pdfDrive();
  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.downloadUrl) {
        throw new Error("Completa o retira los PDF pendientes antes de continuar.");
      }
      const url = await verifyDownload(attachment, drive, false);
      if (url !== attachment.downloadUrl) {
        throw new Error("El enlace de descarga del PDF cambió en Google Drive.");
      }
      return {
        id: attachment.id,
        filename: attachment.filename,
        size: attachment.size,
        downloadUrl: url,
      };
    })
  );
}
