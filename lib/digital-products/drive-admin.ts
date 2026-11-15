import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { driveConfig } from "./drive-config";

export async function driveAdmin() {
  const session = await auth();
  if (!session?.user?.id) { throw new Error("Inicia sesión como administradora."); }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, email: true } });
  if (user?.role !== "ADMIN") { throw new Error("Acceso reservado a administración."); }
  return { id: session.user.id, email: user.email || "" };
}

export function assertDriveOrigin(request: Request) {
  if (request.headers.get("origin") !== driveConfig().origin) { throw new Error("Origen no autorizado."); }
}

export const driveNoStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
