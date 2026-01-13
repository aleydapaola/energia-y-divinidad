import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"

export default async function AdminDashboardPage() {
  // Get stats
  const now = new Date()

  const [
    totalBookings,
    upcomingBookings,
    pendingBookings,
    totalUsers,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({
      where: {
        scheduledAt: { gte: now },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    prisma.booking.count({
      where: { status: "PENDING" },
    }),
    prisma.user.count(),
  ])

  // Get upcoming sessions for today and tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 2)
  tomorrow.setHours(0, 0, 0, 0)

  const nextSessions = await prisma.booking.findMany({
    where: {
      scheduledAt: {
        gte: now,
        lt: tomorrow,
      },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  })

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Dashboard</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Bienvenida al panel de administración
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#f8f0f5] rounded-lg">
              <Calendar className="w-6 h-6 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177]">{totalBookings}</p>
              <p className="text-sm text-gray-500 font-dm-sans">Total Sesiones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177]">{upcomingBookings}</p>
              <p className="text-sm text-gray-500 font-dm-sans">Próximas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177]">{pendingBookings}</p>
              <p className="text-sm text-gray-500 font-dm-sans">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177]">{totalUsers}</p>
              <p className="text-sm text-gray-500 font-dm-sans">Usuarios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Próximas Sesiones</h2>
          <Link
            href="/admin/bookings"
            className="text-sm text-[#8A4BAF] hover:underline font-dm-sans"
          >
            Ver todas
          </Link>
        </div>

        {nextSessions.length > 0 ? (
          <div className="space-y-3">
            {nextSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-[#f8f0f5]/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    {session.resourceName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#654177] font-dm-sans">
                    {session.scheduledAt && formatDateTime(session.scheduledAt)}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      session.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {session.status === "CONFIRMED" ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-dm-sans">
              No hay sesiones programadas para hoy o mañana
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
