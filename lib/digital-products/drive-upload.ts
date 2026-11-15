import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

import { prisma } from "@/lib/prisma";

import { assertPrivateFolder, connectedDrive, driveFetch, drivePermissions, assertPrivatePermissions, type DriveFile } from "./drive-api";
import { decryptDriveSecret, driveConfig, encryptDriveSecret, DRIVE_MAX_BYTES } from "./drive-config";
import { safeFilename, validProductId } from "./files";

export async function authorizeDriveEditor(request: Request, productId: string, checkOnly = false) {
  const config = driveConfig();
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || !validProductId(productId) || request.headers.get("origin") !== config.origin) {
    throw new Error("Inicia sesión en Sanity desde el Studio de este entorno.");
  }
  const id = productId.replace(/^drafts\./, "");
  const editor = createClient({ projectId: "81jpalr2", dataset: config.environment, apiVersion: "2024-01-01",
    useCdn: false, token: authorization.slice(7), perspective: "raw" });
  type Product = { _id: string; _type: string; digitalDeliveryVersion?: number };
  const draft = await editor.getDocument<Product>(`drafts.${id}`);
  const document = draft || (checkOnly ? await editor.getDocument<Product>(id) : undefined);
  if (document?._type !== "product" || document.digitalDeliveryVersion !== 2) { throw new Error("Guarda un borrador de producto nuevo para Drive."); }
  // dryRun proves write permission without changing a published product during a read check.
  await editor.patch(document._id).setIfMissing({ privateDigitalFiles: [] }).commit({ dryRun: checkOnly });
  return id;
}

async function reserveDriveId(token: string) {
  const ids = await driveFetch("files/generateIds?count=1&space=drive&type=files", token);
  if (!ids.ids?.[0]) { throw new Error("No se pudo reservar el archivo."); }
  return ids.ids[0] as string;
}

export async function productDriveFolder(productId: string, drive: Awaited<ReturnType<typeof connectedDrive>>) {
  await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
  const folder = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-folder:${drive.environment}:${productId}`}))`;
    const existing = await tx.productDriveFolder.findUnique({ where: { environment_productId: { environment: drive.environment, productId } } });
    if (existing) { return existing; }
    return tx.productDriveFolder.create({ data: { environment: drive.environment, productId, folderId: await reserveDriveId(drive.accessToken) } });
  });
  const exists = await fetch(`https://www.googleapis.com/drive/v3/files/${folder.folderId}?fields=id`, { headers: { Authorization: `Bearer ${drive.accessToken}` }, cache: "no-store" });
  if (exists.status === 404) {
    await driveFetch("files?fields=id", drive.accessToken, { method: "POST", body: JSON.stringify({ id: folder.folderId,
      name: `Producto ${productId}`, mimeType: "application/vnd.google-apps.folder", parents: [drive.connection.rootFolderId],
      appProperties: { eydEnvironment: drive.environment, eydProduct: productId },
    }) });
  } else if (!exists.ok) { throw new Error("No se pudo comprobar la carpeta privada."); }
  await assertPrivateFolder(folder.folderId, drive);
  return folder;
}

export function validUploadSession(value: string) {
  const url = new URL(value);
  if (url.origin !== "https://www.googleapis.com" || url.pathname !== "/upload/drive/v3/files" ||
      !url.searchParams.get("upload_id") || url.username || url.password) { throw new Error("Sesión de subida no válida."); }
  return url.toString();
}

export function driveFileIntegrity(file: DriveFile, expected: { size: number; sha256: string; folderId: string; ownerId: string }) {
  if (file.trashed) { return "missing" as const; }
  if (file.parents?.length !== 1 || file.parents[0] !== expected.folderId) { return "moved" as const; }
  if (Number(file.size) !== expected.size || file.sha256Checksum !== expected.sha256 ||
      !file.owners?.some((owner) => owner.permissionId === expected.ownerId)) { return "changed" as const; }
  return "valid" as const;
}

/** Google is read-only here. Persist verification in Neon so a detected loss blocks new checkout. */
export async function checkDriveUpload(uploadId: string, productId: string, drive: Awaited<ReturnType<typeof connectedDrive>>) {
  const upload = await prisma.productDriveUpload.findFirst({ where: { id: uploadId, folder: { productId, environment: drive.environment } }, include: { folder: true } });
  if (!upload) { throw new Error("Subida no encontrada."); }
  await assertPrivateFolder(drive.connection.rootFolderId, drive, true);
  const readers = await assertPrivateFolder(upload.folder.folderId, drive);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${upload.fileId}?fields=id,size,sha256Checksum,parents,trashed,owners(permissionId)`, {
    headers: { Authorization: `Bearer ${drive.accessToken}` }, cache: "no-store",
  });
  let state: "valid" | "missing" | "moved" | "changed";
  if (response.status === 404 || response.status === 410) { state = "missing"; }
  else {
    if (!response.ok) { throw new Error("No se pudo comprobar el archivo en Drive."); }
    state = driveFileIntegrity(await response.json(), { size: upload.size, sha256: upload.sha256,
      folderId: upload.folder.folderId, ownerId: drive.connection.ownerPermissionId });
  }
  if (state === "valid") {
    assertPrivatePermissions(await drivePermissions(upload.fileId, drive.accessToken), drive.connection.ownerPermissionId,
      readers.filter((p) => p.role === "reader").map((p) => (p.emailAddress || "").toLowerCase()));
  }
  await prisma.productDriveUpload.update({ where: { id: upload.id }, data: { verifiedAt: state === "valid" ? new Date() : null } });
  return { state };
}

export async function verifyDriveUpload(uploadId: string, productId: string, drive: Awaited<ReturnType<typeof connectedDrive>>) {
  const upload = await prisma.productDriveUpload.findFirst({ where: { id: uploadId, folder: { productId, environment: drive.environment } }, include: { folder: true } });
  if (!upload) { throw new Error("Subida no encontrada."); }
  const readers = await assertPrivateFolder(upload.folder.folderId, drive);
  const file: DriveFile = await driveFetch(`files/${upload.fileId}?fields=id,size,sha256Checksum,parents,trashed,owners(permissionId)`, drive.accessToken);
  if (file.trashed || Number(file.size) !== upload.size || file.sha256Checksum !== upload.sha256 ||
      file.parents?.length !== 1 || file.parents[0] !== upload.folder.folderId ||
      !file.owners?.some((owner) => owner.permissionId === drive.connection.ownerPermissionId)) {
    throw new Error("El archivo no está completo o no coincide con el original.");
  }
  assertPrivatePermissions(await drivePermissions(upload.fileId, drive.accessToken), drive.connection.ownerPermissionId,
    readers.filter((p) => p.role === "reader").map((p) => (p.emailAddress || "").toLowerCase()));
  await prisma.productDriveUpload.update({ where: { id: upload.id }, data: { verifiedAt: new Date(), encryptedSession: null } });
  return { internalFileRef: upload.id, originalFilename: upload.filename, contentType: upload.contentType, size: upload.size };
}

export async function startDriveUpload(productId: string, input: { fileKey: string; sha256: string; filename: string; contentType: string; size: number }) {
  const drive = await connectedDrive();
  const folder = await productDriveFolder(productId, drive);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.fileKey) || !/^[a-f0-9]{64}$/.test(input.sha256) ||
      !Number.isSafeInteger(input.size) || input.size < 1 || input.size > DRIVE_MAX_BYTES || input.filename.length > 250 || input.contentType.length > 150) {
    throw new Error("Archivo no válido o superior a 50 MB.");
  }
  const upload = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`drive-upload:${folder.id}:${input.fileKey}:${input.sha256}`}))`;
    const existing = await tx.productDriveUpload.findUnique({ where: { folderRecordId_fileKey_sha256: { folderRecordId: folder.id, fileKey: input.fileKey, sha256: input.sha256 } } });
    if (existing) { return existing; }
    return tx.productDriveUpload.create({ data: { fileKey: input.fileKey, sha256: input.sha256, contentType: input.contentType,
      size: input.size, filename: safeFilename(input.filename), folderRecordId: folder.id,
      id: randomUUID(), fileId: await reserveDriveId(drive.accessToken) } });
  });
  if (upload.verifiedAt) { return { id: upload.id, complete: true }; }
  // Final response may have been lost. An existing complete file wins over a retry.
  const existing = await fetch(`https://www.googleapis.com/drive/v3/files/${upload.fileId}?fields=id`, { headers: { Authorization: `Bearer ${drive.accessToken}` }, cache: "no-store" });
  if (existing.ok) { await verifyDriveUpload(upload.id, productId, drive); return { id: upload.id, complete: true }; }
  if (existing.status !== 404) { throw new Error("No se pudo comprobar el intento anterior."); }
  if (upload.encryptedSession) { return { id: upload.id, sessionUrl: validUploadSession(decryptDriveSecret(upload.encryptedSession)), complete: false }; }
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${drive.accessToken}`, "Content-Type": "application/json",
      "X-Upload-Content-Type": upload.contentType, "X-Upload-Content-Length": String(upload.size), Origin: drive.origin },
    body: JSON.stringify({ id: upload.fileId, name: upload.filename, mimeType: upload.contentType,
      parents: [folder.folderId], appProperties: { eydEnvironment: drive.environment, eydProduct: productId, eydUpload: upload.id } }),
  });
  if (!response.ok) { throw new Error("Drive no pudo iniciar la subida. Comprueba conexión y espacio disponible."); }
  const sessionUrl = validUploadSession(response.headers.get("Location") || "");
  await prisma.productDriveUpload.update({ where: { id: upload.id }, data: { encryptedSession: encryptDriveSecret(sessionUrl) } });
  return { id: upload.id, sessionUrl, complete: false };
}

export async function driveUploadStatus(id: string, productId: string) {
  const drive = await connectedDrive();
  const upload = await prisma.productDriveUpload.findFirst({ where: { id, folder: { productId, environment: drive.environment } } });
  if (!upload) { throw new Error("Subida no encontrada."); }
  if (upload.verifiedAt) { return { complete: true, offset: upload.size }; }
  if (!upload.encryptedSession) { throw new Error("Vuelve a seleccionar el mismo archivo para reintentar."); }
  const response = await fetch(validUploadSession(decryptDriveSecret(upload.encryptedSession)), {
    method: "PUT", cache: "no-store", redirect: "manual", headers: { "Content-Range": `bytes */${upload.size}`, "Content-Length": "0" },
  });
  if (response.ok) { await verifyDriveUpload(id, productId, drive); return { complete: true, offset: upload.size }; }
  if (response.status === 404 || response.status === 410) {
    await prisma.productDriveUpload.update({ where: { id }, data: { encryptedSession: null } });
    throw new Error("La sesión de subida caducó. Selecciona el mismo archivo para reintentar sin duplicarlo.");
  }
  if (response.status !== 308) { throw new Error("No se pudo consultar la subida. Puedes reintentar."); }
  const range = response.headers.get("Range");
  const match = range?.match(/^bytes=0-(\d+)$/);
  const offset = match ? Number(match[1]) + 1 : 0;
  if (offset > upload.size) { throw new Error("Respuesta de subida no válida."); }
  return { complete: false, offset };
}
