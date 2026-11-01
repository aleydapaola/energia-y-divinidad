import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventById } from "@/lib/sanity/queries/events";

export async function POST() {
  return NextResponse.json(
    { error: "Reserva desde el checkout del evento con PayPal o Bre-B." },
    { status: 410 }
  );
}

// GET: Obtener reservas de eventos de un usuario
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ bookings: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        bookingType: "EVENT",
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    // Enriquecer con información del evento de Sanity
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const event = await getEventById(booking.resourceId);
        return {
          ...booking,
          event: event
            ? {
                title: event.title,
                slug: event.slug.current,
                eventDate: event.eventDate,
                endDate: event.endDate,
                locationType: event.locationType,
                venue: event.venue,
                zoom: booking.status === "CONFIRMED" ? event.zoom : undefined,
                recording: event.recording,
                mainImage: event.mainImage,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ bookings: enrichedBookings });
  } catch (error) {
    console.error("Error fetching event bookings:", error);

    return NextResponse.json({ error: "Error al obtener las reservas" }, { status: 500 });
  }
}
