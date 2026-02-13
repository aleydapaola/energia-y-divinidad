'use client'

import { useRouter } from 'next/navigation'

import { BookingCard } from './BookingCard'

interface BookingData {
  id: string
  resourceName: string
  status: string
  scheduledAt: Date | null
  duration: number | null
  rescheduleCount: number
}

interface BookingsListProps {
  bookings: BookingData[]
}

export function BookingsList({ bookings }: BookingsListProps) {
  const router = useRouter()

  const handleUpdate = () => {
    // Refresh the page to get updated data
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  )
}
