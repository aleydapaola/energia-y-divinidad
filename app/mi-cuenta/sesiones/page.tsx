import { Calendar, Clock, Video } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { BookingsList } from "./BookingsList"

export default async function MisSesionesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/mi-cuenta/sesiones")
  }

  // Obtener todas las reservas del usuario
  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { scheduledAt: "desc" },
  })

  // Separar en próximas, pasadas y canceladas
  const now = new Date()
  const upcomingBookings = bookings.filter(
    (b) => b.scheduledAt && new Date(b.scheduledAt) >= now && b.status !== "CANCELLED"
  )
  const pastBookings = bookings.filter(
    (b) => b.scheduledAt && new Date(b.scheduledAt) < now && b.status !== "CANCELLED"
  )
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED")

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Confirmada</span>
      case "PENDING":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pendiente</span>
      case "COMPLETED":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Completada</span>
      case "CANCELLED":
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelada</span>
      case "NO_SHOW":
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">No asistió</span>
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>
    }
  }

  // Serialize bookings for client component
  const serializedUpcomingBookings = upcomingBookings.map((b) => ({
    id: b.id,
    resourceName: b.resourceName,
    status: b.status,
    scheduledAt: b.scheduledAt,
    duration: b.duration,
    rescheduleCount: b.rescheduleCount,
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-gazeta text-3xl text-[#654177] mb-2">Mis Sesiones</h1>
            <p className="text-gray-600 font-dm-sans">
              Gestiona tus sesiones de canalización
            </p>
          </div>
          <Link
            href="/sesiones"
            className="px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
          >
            Reservar Nueva Sesión
          </Link>
        </div>
      </div>

      {/* Próximas Sesiones - Interactive */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-gazeta text-xl text-[#654177] mb-4">Próximas Sesiones</h2>

        {upcomingBookings.length > 0 ? (
          <BookingsList bookings={serializedUpcomingBookings} />
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-dm-sans mb-4">
              No tienes sesiones programadas
            </p>
            <Link
              href="/sesiones"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4944a4] text-white rounded-lg font-dm-sans hover:bg-[#3d3a8a] transition-colors"
            >
              Explorar Sesiones
            </Link>
          </div>
        )}
      </div>

      {/* Historial de Sesiones */}
      {pastBookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] mb-4">Historial de Sesiones</h2>

          <div className="space-y-3">
            {pastBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-700 font-dm-sans">
                      {booking.resourceName}
                    </p>
                    {getStatusBadge(booking.status)}
                  </div>
                  {booking.scheduledAt && (
                    <p className="text-sm text-gray-500 font-dm-sans mt-1">
                      {formatDate(booking.scheduledAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sesiones Canceladas */}
      {cancelledBookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-gray-500 mb-4">Sesiones Canceladas</h2>

          <div className="space-y-3">
            {cancelledBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-60"
              >
                <div>
                  <p className="font-medium text-gray-500 font-dm-sans">
                    {booking.resourceName}
                  </p>
                  {booking.scheduledAt && (
                    <p className="text-sm text-gray-400 font-dm-sans">
                      {formatDate(booking.scheduledAt)}
                    </p>
                  )}
                  {booking.cancellationReason && (
                    <p className="text-xs text-gray-400 font-dm-sans mt-1">
                      Motivo: {booking.cancellationReason}
                    </p>
                  )}
                </div>
                {getStatusBadge(booking.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
