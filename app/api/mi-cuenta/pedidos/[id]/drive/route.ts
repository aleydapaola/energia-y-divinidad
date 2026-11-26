import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { driveNoStore } from "@/lib/digital-products/drive-admin";
import { ownedDriveAccess } from "@/lib/digital-products/drive-delivery";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) { return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: driveNoStore }); }
  const { id } = await params;
  const url = await ownedDriveAccess(id, session.user.id, new URL(request.url).searchParams.get("producto") ?? undefined);
  if (!url) { return NextResponse.json({ error: "Acceso no disponible" }, { status: 404, headers: driveNoStore }); }
  return new NextResponse(null, { status: 302, headers: { ...driveNoStore, Location: url } });
}
