import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/admin-auth";
import { CAMPAIGN_PDF_LIMIT } from "@/lib/campaign-attachment";
import { assertDriveOrigin, driveNoStore } from "@/lib/digital-products/drive-admin";
import {
  campaignAttachmentStatus,
  finalizeCampaignAttachment,
  removeCampaignAttachment,
  startCampaignAttachment,
} from "@/lib/services/campaign-drive";

const attachmentId = z.string().min(1).max(100);
const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    filename: z.string().trim().min(1).max(200),
    size: z.number().int().min(1).max(CAMPAIGN_PDF_LIMIT),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({ action: z.literal("status"), id: attachmentId }),
  z.object({ action: z.literal("finalize"), id: attachmentId }),
  z.object({ action: z.literal("remove"), id: attachmentId }),
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    assertDriveOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "Origen o conexión de Drive no disponible" },
      { status: 403 }
    );
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Selecciona un PDF válido de hasta 10 MB." },
      { status: 400 }
    );
  }
  const { id } = await context.params;
  const input = parsed.data;
  try {
    switch (input.action) {
      case "start":
        return NextResponse.json(await startCampaignAttachment(id, input), {
          headers: driveNoStore,
        });
      case "status":
        return NextResponse.json(await campaignAttachmentStatus(id, input.id), {
          headers: driveNoStore,
        });
      case "finalize":
        return NextResponse.json(await finalizeCampaignAttachment(id, input.id), {
          headers: driveNoStore,
        });
      case "remove":
        await removeCampaignAttachment(id, input.id);
        return NextResponse.json({ ok: true }, { headers: driveNoStore });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo gestionar el PDF en Drive." },
      { status: 409, headers: driveNoStore }
    );
  }
}
