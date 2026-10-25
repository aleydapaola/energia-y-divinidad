import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** The current UI uses the server-priced PayPal/Bre-B checkout routes. */
export async function POST() {
  return NextResponse.json(
    { error: "Este flujo de reserva ya no está disponible. Vuelve a Sesiones para reservar." },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true },
    });
    if (!actor) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = new URL(request.url).searchParams.get("email")?.trim();
    let userId = actor.id;
    if (email && email.toLowerCase() !== actor.email.toLowerCase()) {
      if (actor.role !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      const target = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ bookings: [] });
      }
      userId = target.id;
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch {
    return NextResponse.json({ error: "Error al obtener las reservas" }, { status: 500 });
  }
}
