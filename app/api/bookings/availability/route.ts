import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getBookingSettings,
  isHoliday,
  isInBlockedRange,
  getTimeSlotsForDayOfWeek,
} from "@/lib/sanity/queries/bookingSettings";
import { getSessionBySlug } from "@/lib/sanity/queries/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TimeSlot {
  time: string;
  available: boolean;
  label: string;
}

const COLOMBIA_TIME_ZONE = "America/Bogota";
const BOOKING_BLOCKING_STATUSES = ["PENDING_PAYMENT", "PENDING", "CONFIRMED"] as const;

function getColombiaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-05:00`);
}

function getColombiaDayOfWeek(date: string): number {
  return getColombiaDateTime(date, "12:00").getUTCDay();
}

function getColombiaTimeString(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: COLOMBIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getColombiaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * GET /api/bookings/availability?date=YYYY-MM-DD&slug=session-slug
 * Returns available time slots for a specific session on a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const slug = searchParams.get("slug");

    // Validate parameters
    if (!dateParam || !slug) {
      return NextResponse.json(
        { error: "Missing required parameters: date and slug" },
        { status: 400 }
      );
    }

    // Parse and validate date
    const selectedDate = getColombiaDateTime(dateParam, "00:00");
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }

    // Get session and booking settings from Sanity
    const [session, bookingSettings] = await Promise.all([
      getSessionBySlug(slug),
      getBookingSettings(),
    ]);

    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session not found or not available" }, { status: 404 });
    }

    // Get holidays and blocked dates from settings
    const holidays = bookingSettings?.holidays || [];
    const blockedDates = bookingSettings?.blockedDates || [];

    // Check if date is a holiday
    if (isHoliday(dateParam, holidays)) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: "This date is a holiday",
      });
    }

    // Check if date is in a blocked range
    if (isInBlockedRange(dateParam, blockedDates)) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: "This date is not available for bookings",
      });
    }

    // Check if date is in the past
    const todayParam = getColombiaDateString(new Date());

    if (dateParam < todayParam) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: "Date is in the past",
      });
    }

    // Check max advance booking
    const maxDate = getColombiaDateTime(todayParam, "00:00");
    maxDate.setUTCDate(maxDate.getUTCDate() + session.maxAdvanceBooking);
    const maxDateParam = getColombiaDateString(maxDate);

    if (dateParam > maxDateParam) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: `Cannot book more than ${session.maxAdvanceBooking} days in advance`,
      });
    }

    // Get available time slots for this day of week from global settings
    const dayOfWeek = getColombiaDayOfWeek(dateParam);
    const daySlots = getTimeSlotsForDayOfWeek(bookingSettings?.weeklySchedule, dayOfWeek);

    if (!daySlots || daySlots.length === 0) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: "No availability on this day of the week",
      });
    }

    // Get existing 1:1 session bookings for this Colombia calendar date.
    // Some historical flows store different resourceIds ("session-flexible",
    // "session-canalizacion", Sanity id), but all 1:1 sessions share the same
    // availability calendar.
    const startOfDay = getColombiaDateTime(dateParam, "00:00");
    const endOfDay = new Date(`${dateParam}T23:59:59.999-05:00`);

    const existingBookings = await prisma.booking.findMany({
      where: {
        bookingType: "SESSION_1_ON_1",
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [...BOOKING_BLOCKING_STATUSES],
        },
      },
      select: {
        scheduledAt: true,
      },
    });

    // Convert existing bookings to set of booked times
    const bookedTimes = new Set(
      existingBookings.flatMap((booking) =>
        booking.scheduledAt ? [getColombiaTimeString(booking.scheduledAt)] : []
      )
    );

    // Generate slots based on day schedule
    const slots: TimeSlot[] = [];

    for (const slot of daySlots) {
      const [startHour, startMinute] = slot.start.split(":").map(Number);
      const [endHour, endMinute] = slot.end.split(":").map(Number);

      // Calculate total minutes in this slot
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      const _slotDurationMinutes = endTotalMinutes - startTotalMinutes;

      // Generate time slots based on session duration + buffer between sessions
      const sessionDurationMinutes = session.duration;
      const bufferMinutes = session.bufferTime ?? 30;
      let currentMinutes = startTotalMinutes;

      while (currentMinutes + sessionDurationMinutes <= endTotalMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        // Check if this time is already booked
        const isBooked = bookedTimes.has(timeString);

        // Check minimum lead time
        let meetsLeadTime = true;
        if (dateParam === todayParam) {
          const now = new Date();
          const slotDateTime = getColombiaDateTime(dateParam, timeString);

          const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          meetsLeadTime = hoursUntilSlot >= session.bookingLeadTime;
        }

        // Calculate end time for label (only session duration, not buffer)
        const endMinutes = currentMinutes + sessionDurationMinutes;
        const endHourCalc = Math.floor(endMinutes / 60);
        const endMinuteCalc = endMinutes % 60;
        const endTimeString = `${endHourCalc.toString().padStart(2, "0")}:${endMinuteCalc.toString().padStart(2, "0")}`;

        slots.push({
          time: timeString,
          available: !isBooked && meetsLeadTime,
          label: `${timeString} - ${endTimeString}`,
        });

        // Move to next slot: session duration + buffer between sessions
        currentMinutes += sessionDurationMinutes + bufferMinutes;
      }
    }

    // Filter to only show available slots (or all if for display purposes)
    const hasAvailable = slots.some((s) => s.available);

    return NextResponse.json({
      available: hasAvailable,
      slots,
      date: dateParam,
      session: {
        title: session.title,
        duration: session.duration,
        leadTime: session.bookingLeadTime,
      },
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
