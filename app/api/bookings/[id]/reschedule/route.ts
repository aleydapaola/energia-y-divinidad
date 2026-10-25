import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { sendRescheduleEmail } from "@/lib/email";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { moveSessionBooking, SessionSchedulingError } from "@/lib/session-scheduling";

const input = z.object({
  newDate: z.string().datetime({ offset: true }),
  reason: z.string().max(2000).optional(),
});
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "La fecha o el motivo no son válidos" }, { status: 400 });
  }
  try {
    const result = await moveSessionBooking({
      id: (await params).id,
      actorId: session.user.id,
      newDate: new Date(body.data.newDate),
      reason: body.data.reason,
    });
    try {
      await syncBookingToGoogleCalendar(result.updated.id);
    } catch (error) {
      console.error("Sincronización de calendario pendiente:", error);
    }
    try {
      await sendRescheduleEmail({
        email: result.before.user.email,
        name: result.before.user.name || "Querida alma",
        sessionName: result.before.resourceName,
        previousDate: result.before.scheduledAt,
        newDate: result.updated.scheduledAt!,
        rescheduledBy: result.isAdmin ? "admin" : "client",
        reason: body.data.reason,
      });
    } catch (error) {
      console.error("Error enviando email de reprogramación:", error);
    }
    return NextResponse.json({
      success: true,
      booking: {
        id: result.updated.id,
        scheduledAt: result.updated.scheduledAt,
        previousScheduledAt: result.updated.previousScheduledAt,
        rescheduleCount: result.updated.rescheduleCount,
        status: result.updated.status,
      },
      message: "Sesión reprogramada exitosamente",
    });
  } catch (error) {
    if (error instanceof SessionSchedulingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error reprogramando sesión:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la agenda. Recarga tus sesiones antes de reintentar." },
      { status: 503 }
    );
  }
}
