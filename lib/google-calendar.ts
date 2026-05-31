import { BookingType, type Prisma } from "@prisma/client";
import { google, type calendar_v3 } from "googleapis";

import { prisma } from "@/lib/prisma";

type BookingWithUser = Prisma.BookingGetPayload<{
  include: {
    user: {
      select: {
        email: true;
        name: true;
      };
    };
  };
}>;

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DEFAULT_TIME_ZONE = "Europe/Madrid";

function getGoogleCalendarConfig() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!calendarId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  return {
    calendarId,
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
    timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || DEFAULT_TIME_ZONE,
  };
}

function getCalendarClient() {
  const config = getGoogleCalendarConfig();

  if (!config) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [CALENDAR_SCOPE],
  });

  return {
    calendar: google.calendar({ version: "v3", auth }),
    config,
  };
}

function isSyncableSessionBooking(booking: BookingWithUser) {
  return (
    booking.bookingType === BookingType.SESSION_1_ON_1 &&
    booking.status === "CONFIRMED" &&
    Boolean(booking.scheduledAt)
  );
}

function buildCalendarEvent(booking: BookingWithUser): calendar_v3.Schema$Event {
  if (!booking.scheduledAt) {
    throw new Error("La reserva no tiene fecha programada");
  }

  const start = booking.scheduledAt;
  const end = new Date(start.getTime() + (booking.duration || 60) * 60 * 1000);
  const clientName = booking.user.name || "Cliente";
  const clientEmail = booking.user.email || "Email no disponible";
  const notes = booking.userNotes ? `\n\nNotas de la clienta:\n${booking.userNotes}` : "";

  return {
    summary: `Sesión - ${clientName}`,
    description:
      `Reserva creada desde Energia y Divinidad.\n\n` +
      `Sesión: ${booking.resourceName}\n` +
      `Cliente: ${clientName}\n` +
      `Email: ${clientEmail}\n` +
      `ID reserva: ${booking.id}` +
      notes,
    start: {
      dateTime: start.toISOString(),
      timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || DEFAULT_TIME_ZONE,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || DEFAULT_TIME_ZONE,
    },
  };
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

async function markCalendarSyncSuccess(bookingId: string, eventId?: string | null) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      googleCalendarEventId: eventId || undefined,
      googleCalendarSyncedAt: new Date(),
      googleCalendarSyncError: null,
    },
  });
}

async function markCalendarSyncError(bookingId: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Error desconocido sincronizando Google Calendar";

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      googleCalendarSyncError: message,
    },
  });
}

export async function syncBookingToGoogleCalendar(bookingId: string) {
  const client = getCalendarClient();

  if (!client) {
    return { skipped: true, reason: "Google Calendar no configurado" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!booking || !isSyncableSessionBooking(booking)) {
    return { skipped: true, reason: "Reserva no sincronizable" };
  }

  try {
    const event = buildCalendarEvent(booking);

    if (booking.googleCalendarEventId) {
      await client.calendar.events.update({
        calendarId: client.config.calendarId,
        eventId: booking.googleCalendarEventId,
        requestBody: event,
      });

      await markCalendarSyncSuccess(booking.id, booking.googleCalendarEventId);
      return { success: true, eventId: booking.googleCalendarEventId, action: "updated" };
    }

    const created = await client.calendar.events.insert({
      calendarId: client.config.calendarId,
      requestBody: event,
    });

    await markCalendarSyncSuccess(booking.id, created.data.id);
    return { success: true, eventId: created.data.id, action: "created" };
  } catch (error) {
    await markCalendarSyncError(booking.id, error);
    console.error(`[GOOGLE_CALENDAR] Error sincronizando reserva ${booking.id}:`, error);
    return { success: false, error };
  }
}

export async function removeBookingFromGoogleCalendar(bookingId: string) {
  const client = getCalendarClient();

  if (!client) {
    return { skipped: true, reason: "Google Calendar no configurado" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      googleCalendarEventId: true,
    },
  });

  if (!booking?.googleCalendarEventId) {
    return { skipped: true, reason: "Reserva sin evento de Google Calendar" };
  }

  try {
    await client.calendar.events.delete({
      calendarId: client.config.calendarId,
      eventId: booking.googleCalendarEventId,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleCalendarEventId: null,
        googleCalendarSyncedAt: new Date(),
        googleCalendarSyncError: null,
      },
    });

    return { success: true, action: "deleted" };
  } catch (error: unknown) {
    if (getErrorCode(error) === 404) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          googleCalendarEventId: null,
          googleCalendarSyncedAt: new Date(),
          googleCalendarSyncError: null,
        },
      });

      return { success: true, action: "already_deleted" };
    }

    await markCalendarSyncError(booking.id, error);
    console.error(`[GOOGLE_CALENDAR] Error eliminando evento de reserva ${booking.id}:`, error);
    return { success: false, error };
  }
}
