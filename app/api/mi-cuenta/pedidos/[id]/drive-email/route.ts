import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { driveNoStore } from "@/lib/digital-products/drive-admin";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) { return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: driveNoStore }); }
  return NextResponse.json({ error: "El acceso se entrega únicamente al correo verificado del titular. No se admite otro destinatario." }, { status: 410, headers: driveNoStore });
}
