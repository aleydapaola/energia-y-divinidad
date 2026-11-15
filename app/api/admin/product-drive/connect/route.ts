import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { driveAdmin, assertDriveOrigin, driveNoStore } from "@/lib/digital-products/drive-admin";
import { driveConfig, DRIVE_SCOPE } from "@/lib/digital-products/drive-config";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const admin = await driveAdmin();
    assertDriveOrigin(request);
    const config = driveConfig();
    const state = randomBytes(32).toString("base64url");
    await prisma.verificationToken.create({ data: {
      identifier: `eyd-drive:${config.environment}:${admin.id}`,
      token: createHash("sha256").update(state).digest("hex"), expires: new Date(Date.now() + 10 * 60_000),
    } });
    (await cookies()).set("__Host-eyd-drive-state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
      response_type: "code", scope: DRIVE_SCOPE, access_type: "offline", prompt: "consent",
      login_hint: config.ownerEmail, state });
    return new NextResponse(null, { status: 303, headers: { ...driveNoStore, Location: `https://accounts.google.com/o/oauth2/v2/auth?${query}` } });
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar la conexión. Revisa la configuración de Drive de este entorno." }, { status: 403, headers: driveNoStore });
  }
}
