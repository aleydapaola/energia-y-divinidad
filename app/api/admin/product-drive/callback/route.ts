import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { driveAdmin, driveNoStore } from "@/lib/digital-products/drive-admin";
import { assertPrivatePermissions, driveFetch, drivePermissions, googleToken } from "@/lib/digital-products/drive-api";
import { driveConfig, encryptDriveSecret } from "@/lib/digital-products/drive-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const config = driveConfig();
  let connected = false;
  try {
    const admin = await driveAdmin();
    const url = new URL(request.url);
    const jar = await cookies();
    const state = url.searchParams.get("state");
    const saved = jar.get("__Host-eyd-drive-state")?.value;
    jar.delete("__Host-eyd-drive-state");
    if (!state || state !== saved || url.origin !== config.origin) { throw new Error("Estado no válido."); }
    const used = await prisma.verificationToken.deleteMany({ where: {
      identifier: `eyd-drive:${config.environment}:${admin.id}`,
      token: createHash("sha256").update(state).digest("hex"), expires: { gt: new Date() },
    } });
    const code = url.searchParams.get("code");
    if (used.count !== 1 || !code || url.searchParams.has("error")) { throw new Error("Autorización incompleta."); }
    const token = await googleToken({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri });
    const about = await driveFetch("about?fields=user(emailAddress,permissionId),storageQuota", token.access_token);
    if (about.user?.emailAddress?.toLowerCase() !== config.ownerEmail || !about.user?.permissionId || !token.refresh_token) {
      throw new Error("Autoriza la cuenta propietaria esperada con acceso offline.");
    }
    const existing = await prisma.productDriveConnection.findUnique({ where: { environment: config.environment } });
    if (existing && existing.ownerEmail !== config.ownerEmail) { throw new Error("No se puede sustituir la propietaria existente."); }
    let rootFolderId = existing?.rootFolderId;
    if (!rootFolderId) {
      const root = await driveFetch("files?fields=id", token.access_token, { method: "POST", body: JSON.stringify({
        name: config.environment === "preview" ? "EYD — Productos de prueba" : "EYD Productos digitales Production",
        mimeType: "application/vnd.google-apps.folder", appProperties: { eydEnvironment: config.environment },
      }) });
      rootFolderId = root.id as string;
    }
    assertPrivatePermissions(await drivePermissions(rootFolderId, token.access_token), about.user.permissionId, []);
    await prisma.productDriveConnection.upsert({ where: { environment: config.environment },
      create: { environment: config.environment, ownerEmail: config.ownerEmail, ownerPermissionId: about.user.permissionId,
        encryptedRefreshToken: encryptDriveSecret(token.refresh_token), rootFolderId },
      update: { encryptedRefreshToken: encryptDriveSecret(token.refresh_token) },
    });
    connected = true;
  } catch { /* Never expose OAuth codes, responses, tokens or private references. */ }
  return new NextResponse(null, { status: 303, headers: { ...driveNoStore, Location: `${config.origin}/admin/product-drive?connection=${connected ? "ok" : "failed"}` } });
}
