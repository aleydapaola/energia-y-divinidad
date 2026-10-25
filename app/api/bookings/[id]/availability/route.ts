import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sessionAvailability, SessionSchedulingError } from "@/lib/session-scheduling";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  }
  const [actor, booking] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    prisma.booking.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        userId: true,
        bookingType: true,
        duration: true,
        status: true,
        sessionsTotal: true,
      },
    }),
  ]);
  if (!actor || !booking || (actor.role !== "ADMIN" && booking.userId !== session.user.id)) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (
    booking.bookingType !== "SESSION_1_ON_1" ||
    (booking.sessionsTotal ?? 1) > 1 ||
    !["CONFIRMED", "PENDING"].includes(booking.status)
  ) {
    return NextResponse.json({ error: "Esta reserva no admite programación" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await sessionAvailability(date, {
        excludeBookingId: booking.id,
        duration: booking.duration ?? undefined,
      })
    );
  } catch (error) {
    if (error instanceof SessionSchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "La agenda no está disponible temporalmente" },
      { status: 503 }
    );
  }
}
