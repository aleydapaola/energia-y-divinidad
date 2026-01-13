import { prisma } from "@/lib/prisma"
import { AdminBookingsList } from "./AdminBookingsList"

export default async function AdminBookingsPage() {
  // Get all bookings with user info
  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  })

  // Serialize for client
  const serializedBookings = bookings.map((b) => ({
    id: b.id,
    userId: b.userId,
    userName: b.user.name,
    userEmail: b.user.email,
    resourceName: b.resourceName,
    bookingType: b.bookingType,
    status: b.status,
    scheduledAt: b.scheduledAt?.toISOString() || null,
    duration: b.duration,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    amount: b.amount ? Number(b.amount) : null,
    currency: b.currency,
    rescheduleCount: b.rescheduleCount,
    cancellationReason: b.cancellationReason,
    adminNotes: b.adminNotes,
    createdAt: b.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Sesiones</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra todas las sesiones de canalización
        </p>
      </div>

      <AdminBookingsList initialBookings={serializedBookings} />
    </div>
  )
}
