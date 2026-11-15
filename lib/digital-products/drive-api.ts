import { prisma } from "@/lib/prisma";

import { decryptDriveSecret, driveConfig, DRIVE_SCOPE } from "./drive-config";

export type DrivePermission = { id?: string; type?: string; role?: string; emailAddress?: string; deleted?: boolean };
export type DriveFile = { id?: string; size?: string; sha256Checksum?: string; mimeType?: string; parents?: string[];
  trashed?: boolean; owners?: { permissionId?: string }[] };

export async function googleToken(fields: Record<string, string>) {
  const config = driveConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...fields }),
  });
  if (!response.ok) { throw new Error("Google requiere volver a conectar la cuenta propietaria."); }
  const data = await response.json() as { access_token: string; refresh_token?: string; scope?: string };
  if (!data.access_token || (data.scope && !data.scope.split(" ").includes(DRIVE_SCOPE))) {
    throw new Error("Google no ha concedido el permiso de archivos solicitado.");
  }
  return data;
}

export async function driveFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) { throw new Error("No se pudo comprobar Drive. Revisa conexión, permisos y cuota; no se ha concedido acceso."); }
  return response.json();
}

export async function connectedDrive() {
  const config = driveConfig();
  const connection = await prisma.productDriveConnection.findUnique({ where: { environment: config.environment } });
  if (!connection || connection.ownerEmail !== config.ownerEmail) { throw new Error("Conecta primero la cuenta propietaria de Drive."); }
  const token = await googleToken({ grant_type: "refresh_token", refresh_token: decryptDriveSecret(connection.encryptedRefreshToken) });
  return { ...config, connection, accessToken: token.access_token };
}

export function validDriveId(value: string) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(value)) { throw new Error("Referencia de Drive no válida."); }
  return value;
}
export function driveFolderUrl(id: string) { return `https://drive.google.com/drive/folders/${validDriveId(id)}`; }

export async function drivePermissions(id: string, token: string): Promise<DrivePermission[]> {
  const permissions: DrivePermission[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ fields: "nextPageToken,permissions(id,type,role,emailAddress,deleted)", pageSize: "100" });
    if (pageToken) { query.set("pageToken", pageToken); }
    const page = await driveFetch(`files/${validDriveId(id)}/permissions?${query}`, token);
    permissions.push(...page.permissions || []);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return permissions;
}

export function assertPrivatePermissions(permissions: DrivePermission[], ownerId: string, readers: string[]) {
  if (!permissions.some((p) => p.id === ownerId && p.role === "owner")) { throw new Error("La propietaria de la carpeta no coincide."); }
  for (const p of permissions) {
    if (p.id === ownerId && p.role === "owner" && p.type === "user" && !p.deleted) { continue; }
    if (!p.deleted && p.type === "user" && p.role === "reader" && readers.includes((p.emailAddress || "").toLowerCase())) { continue; }
    throw new Error("La carpeta contiene permisos públicos o no autorizados para este producto.");
  }
}

export async function assertPrivateFolder(folderId: string, drive: Awaited<ReturnType<typeof connectedDrive>>, root = false) {
  const id = validDriveId(folderId);
  const file: DriveFile = await driveFetch(`files/${id}?fields=id,mimeType,parents,trashed,owners(permissionId)`, drive.accessToken);
  if (file.trashed || file.mimeType !== "application/vnd.google-apps.folder" ||
      !file.owners?.some((owner) => owner.permissionId === drive.connection.ownerPermissionId) ||
      (!root && !file.parents?.includes(drive.connection.rootFolderId))) {
    throw new Error("La carpeta no pertenece al producto y entorno autorizados.");
  }
  const grants = root ? [] : await prisma.driveProductDelivery.findMany({
    where: { environment: drive.environment, folderId: id, status: { in: ["PENDING_ACCESS", "GRANTED", "PENDING_REVOCATION"] } },
    select: { recipientEmail: true },
  });
  const permissions = await drivePermissions(id, drive.accessToken);
  assertPrivatePermissions(permissions, drive.connection.ownerPermissionId, grants.map((g) => g.recipientEmail));
  return permissions;
}
