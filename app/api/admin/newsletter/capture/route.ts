import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const since = new Date(Date.now() - 30 * 86400000);
  const [captures, metrics] = await Promise.all([
    prisma.newsletterCapture.groupBy({
      by: ["source", "variant", "device", "status"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.newsletterMetric.groupBy({
      by: ["source", "variant", "device", "event"],
      where: { day: { gte: new Date(since.toISOString().slice(0, 10)) } },
      _sum: { count: true },
    }),
  ]);
  return NextResponse.json(
    { since: since.toISOString(), captures, metrics },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
