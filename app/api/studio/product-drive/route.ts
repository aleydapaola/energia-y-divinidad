import { NextResponse } from "next/server";
import { z } from "zod";

import { driveNoStore } from "@/lib/digital-products/drive-admin";
import { connectedDrive } from "@/lib/digital-products/drive-api";
import { driveConfig, DRIVE_MAX_BYTES } from "@/lib/digital-products/drive-config";
import { authorizeDriveEditor, checkDriveUpload, driveUploadStatus, startDriveUpload, verifyDriveUpload } from "@/lib/digital-products/drive-upload";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), productId: z.string().max(150), fileKey: z.string().min(1).max(100),
    sha256: z.string().regex(/^[a-f0-9]{64}$/), filename: z.string().min(1).max(250), contentType: z.string().min(1).max(150), size: z.number().int().positive().max(DRIVE_MAX_BYTES) }),
  z.object({ action: z.enum(["status", "finalize", "check"]), productId: z.string().max(150), id: z.string().uuid() }),
]);

export async function POST(request: Request) {
  const limited = applyRateLimit(request, { maxRequests: 90, windowMs: 60_000 });
  if (limited) { return limited; }
  try {
    const body = input.parse(await request.json());
    const productId = await authorizeDriveEditor(request, body.productId, body.action === "check");
    let result;
    if (body.action === "start") {
      result = await startDriveUpload(productId, body);
    } else if (body.action === "status") {
      result = await driveUploadStatus(body.id, productId);
    } else if (body.action === "check") {
      result = await checkDriveUpload(body.id, productId, await connectedDrive());
    } else {
      result = await verifyDriveUpload(body.id, productId, await connectedDrive());
    }
    return NextResponse.json(result, { headers: driveNoStore });
  } catch {
    return NextResponse.json({ error: "No se pudo completar la subida privada. Revisa la conexión Drive, tu permiso de edición y vuelve a seleccionar el mismo archivo para reintentar." }, { status: 403, headers: driveNoStore });
  }
}

export async function GET() {
  try {
    const config = driveConfig();
    const connection = await prisma.productDriveConnection.findUnique({ where: { environment: config.environment }, select: { ownerEmail: true } });
    return NextResponse.json({ ready: connection?.ownerEmail === config.ownerEmail, maximumSizeInBytes: DRIVE_MAX_BYTES }, { headers: driveNoStore });
  } catch {
    return NextResponse.json({ ready: false, maximumSizeInBytes: DRIVE_MAX_BYTES }, { status: 503, headers: driveNoStore });
  }
}
