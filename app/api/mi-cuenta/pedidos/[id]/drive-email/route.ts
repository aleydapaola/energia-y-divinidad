import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertDriveOrigin, driveNoStore } from "@/lib/digital-products/drive-admin";
import { changeDriveRecipient } from "@/lib/digital-products/drive-delivery";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) { return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: driveNoStore }); }
  try {
    assertDriveOrigin(request);
    const body = z.object({ email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()) }).parse(await request.json());
    await changeDriveRecipient((await params).id, session.user.id, body.email);
    return NextResponse.json({ ok: true }, { headers: driveNoStore });
  } catch {
    return NextResponse.json({ error: "No se pudo cambiar la cuenta. Revisa el correo; si hay una retirada de permiso pendiente, debe resolverla Aleyda antes de otro cambio." }, { status: 409, headers: driveNoStore });
  }
}
