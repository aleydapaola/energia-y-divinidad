import { NextResponse } from "next/server";
import { z } from "zod";

import { assertDriveOrigin, driveAdmin, driveNoStore } from "@/lib/digital-products/drive-admin";
import { deliverPaidDriveOrder } from "@/lib/digital-products/drive-auto-delivery";
import { administerDriveDelivery } from "@/lib/digital-products/drive-delivery";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await driveAdmin(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: driveNoStore });
  }
  try {
    assertDriveOrigin(request);
    const body = z.object({ action: z.enum(["retry", "refund", "revoke"]), revision: z.number().int().nonnegative(),
      productId: z.string().min(1).max(150).optional(), confirmed: z.literal(true), reference: z.string().trim().min(3).max(250).optional() }).parse(await request.json());
    if (body.action === "retry") {
      return NextResponse.json(await deliverPaidDriveOrder((await params).id, undefined, body.productId), { headers: driveNoStore });
    }
    await administerDriveDelivery((await params).id, actor, { action: body.action, revision: body.revision, productId: body.productId, reference: body.reference });
    return NextResponse.json({ ok: true }, { headers: driveNoStore });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la entrega. Recarga el pedido y comprueba pago, correo y permiso de lector en la carpeta privada. Para retirar, quita antes el permiso en Drive salvo que otra compra vigente lo conserve." }, { status: 409, headers: driveNoStore });
  }
}
