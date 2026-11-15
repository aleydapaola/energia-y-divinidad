import { driveFetch, validDriveId } from "./drive-api";

export type DriveFilePolicy = "PAID_DOWNLOAD" | "FREE_PDF_VIEW";

/** Apply to an individual file, never a folder. Private sharing is checked separately. */
export async function applyDriveFilePolicy(fileId: string, contentType: string, policy: DriveFilePolicy, token: string,
  expected?: { folderId: string; ownerId: string }) {
  if (policy === "FREE_PDF_VIEW" && contentType !== "application/pdf") {
    throw new Error("Drive no permite escuchar un audio con la descarga bloqueada. El audio gratuito queda pendiente.");
  }
  const restricted = policy === "FREE_PDF_VIEW";
  const path = `files/${validDriveId(fileId)}?fields=id,mimeType,parents,trashed,owners(permissionId),copyRequiresWriterPermission`;
  type PolicyFile = { id?: string; mimeType?: string; copyRequiresWriterPermission?: boolean; trashed?: boolean;
    parents?: string[]; owners?: { permissionId?: string }[] };
  let file = await driveFetch(path, token) as PolicyFile;
  if (file.trashed || file.id !== fileId || file.mimeType !== contentType || (expected &&
      (file.parents?.length !== 1 || file.parents[0] !== expected.folderId || !file.owners?.some((owner) => owner.permissionId === expected.ownerId)))) {
    throw new Error("El archivo ya no está en su carpeta privada autorizada.");
  }
  if (file.copyRequiresWriterPermission !== restricted) {
    file = await driveFetch(path, token, { method: "PATCH", body: JSON.stringify({ copyRequiresWriterPermission: restricted }) }) as PolicyFile;
  }
  if (file.id !== fileId || file.mimeType !== contentType || file.copyRequiresWriterPermission !== restricted) {
    throw new Error("Drive no ha confirmado la regla de descarga de este archivo.");
  }
}
