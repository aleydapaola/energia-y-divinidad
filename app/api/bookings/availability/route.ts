import { NextRequest, NextResponse } from 'next/server'
import { getSessionBySlug } from '@/lib/sanity/queries/sessions'
import {
  getBookingSettings,
  isHoliday,
  isInBlockedRange,
  getTimeSlotsForDayOfWeek
} from '@/lib/sanity/queries/bookingSettings'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TimeSlot {
  time: string
  available: boolean
  label: string
}

/**
 * GET /api/bookings/availability?date=YYYY-MM-DD&slug=session-slug
 * Returns available time slots for a specific session on a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const slug = searchParams.get('slug')

    // Validate parameters
    if (!dateParam || !slug) {
      return NextResponse.json(
        { error: 'Missing required parameters: date and slug' },
        { status: 400 }
      )
    }

    // Parse and validate date
    const selectedDate = new Date(dateParam)
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Get session and booking settings from Sanity
    const [session, bookingSettings] = await Promise.all([
      getSessionBySlug(slug),
      getBookingSettings(),
    ])

    if (!session || session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session not found or not available' },
        { status: 404 }
      )
    }

    // Get holidays and blocked dates from settings
    const holidays = bookingSettings?.holidays || []
    const blockedDates = bookingSettings?.blockedDates || []

    // Check if date is a holiday
    if (isHoliday(dateParam, holidays)) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: 'This date is a holiday',
      })
    }

    // Check if date is in a blocked range
    if (isInBlockedRange(dateParam, blockedDates)) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: 'This date is not available for bookings',
      })
    }

    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(selectedDate)
    checkDate.setHours(0, 0, 0, 0)

    if (checkDate < today) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: 'Date is in the past',
      })
    }

    // Check max advance booking
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + session.maxAdvanceBooking)
    maxDate.setHours(0, 0, 0, 0)

    if (checkDate > maxDate) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: `Cannot book more than ${session.maxAdvanceBooking} days in advance`,
      })
    }

    // Get available time slots for this day of week from global settings
    const dayOfWeek = selectedDate.getDay()
    const daySlots = getTimeSlotsForDayOfWeek(bookingSettings?.weeklySchedule, dayOfWeek)

    if (!daySlots || daySlots.length === 0) {
      return NextResponse.json({
        available: false,
        slots: [],
        date: dateParam,
        reason: 'No availability on this day of the week',
      })
    }

    // Get existing bookings for this date and session
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingBookings = await prisma.booking.findMany({
      where: {
        resourceId: session._id,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      select: {
        scheduledAt: true,
      },
    })

    // Convert existing bookings to set of booked times
    const bookedTimes = new Set(
      existingBookings
        .filter((booking) => booking.scheduledAt !== null)
        .map((booking) => {
          const hour = booking.scheduledAt!.getHours()
          const minutes = booking.scheduledAt!.getMinutes()
          return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        })
    )

    // Generate slots based on day schedule
    const slots: TimeSlot[] = []

    for (const slot of daySlots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number)
      const [endHour, endMinute] = slot.end.split(':').map(Number)

      // Calculate total minutes in this slot
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      const slotDurationMinutes = endTotalMinutes - startTotalMinutes

      // Generate time slots based on session duration
      const sessionDurationMinutes = session.duration
      let currentMinutes = startTotalMinutes

      while (currentMinutes + sessionDurationMinutes <= endTotalMinutes) {
        const hour = Math.floor(currentMinutes / 60)
        const minute = currentMinutes % 60
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        // Check if this time is already booked
        const isBooked = bookedTimes.has(timeString)

        // Check minimum lead time
        let meetsLeadTime = true
        if (checkDate.getTime() === today.getTime()) {
          const now = new Date()
          const slotDateTime = new Date(selectedDate)
          slotDateTime.setHours(hour, minute, 0, 0)

          const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
          meetsLeadTime = hoursUntilSlot >= session.bookingLeadTime
        }

        // Calculate end time for label
        const endMinutes = currentMinutes + sessionDurationMinutes
        const endHourCalc = Math.floor(endMinutes / 60)
        const endMinuteCalc = endMinutes % 60
        const endTimeString = `${endHourCalc.toString().padStart(2, '0')}:${endMinuteCalc.toString().padStart(2, '0')}`

        slots.push({
          time: timeString,
          available: !isBooked && meetsLeadTime,
          label: `${timeString} - ${endTimeString}`,
        })

        // Move to next slot (every session duration)
        currentMinutes += sessionDurationMinutes
      }
    }

    // Filter to only show available slots (or all if for display purposes)
    const hasAvailable = slots.some((s) => s.available)

    return NextResponse.json({
      available: hasAvailable,
      slots,
      date: dateParam,
      session: {
        title: session.title,
        duration: session.duration,
        leadTime: session.bookingLeadTime,
      },
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
