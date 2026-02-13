import { Calendar, ShoppingBag, Crown, ArrowRight, GraduationCap, CalendarCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CreditsCard } from "@/components/cuenta/CreditsCard"
import { auth } from "@/lib/auth"
import { getUserCourses } from "@/lib/course-access"
import { hasActiveMembership } from "@/lib/membership-access"
import { prisma } from "@/lib/prisma"


export default async function MiCuentaPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/mi-cuenta")
  }

  // Obtener datos del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          bookings: true,
          orders: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/auth/signin")
  }

  // Verificar membresía
  const hasMembership = await hasActiveMembership(session.user.id)

  // Obtener próximas sesiones (solo de canalización, no eventos)
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
      bookingType: "SESSION_1_ON_1",
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 3,
  })

  // Obtener próximos eventos
  const upcomingEvents = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
      bookingType: "EVENT",
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 3,
  })

  // Obtener cursos del usuario
  const userCourses = await getUserCourses(session.user.id)
  const coursesInProgress = userCourses.filter(
    (c) => Number(c.completionPercentage) > 0 && Number(c.completionPercentage) < 100
  )

  // Obtener últimas compras
  const recentOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="font-gazeta text-3xl text-[#654177] mb-2">
          Hola, {user.name?.split(" ")[0] || "Usuario"}
        </h1>
        <p className="text-gray-600 font-dm-sans">
          Bienvenida a tu espacio personal en Energía y Divinidad
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#654177] font-dm-sans">
                {upcomingBookings.length}
              </p>
              <p className="text-xs text-gray-500 font-dm-sans">Sesiones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#654177] font-dm-sans">
                {userCourses.length}
              </p>
              <p className="text-xs text-gray-500 font-dm-sans">Cursos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#654177] font-dm-sans">
                {upcomingEvents.length}
              </p>
              <p className="text-xs text-gray-500 font-dm-sans">Eventos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasMembership ? "bg-gradient-to-r from-[#8A4BAF] to-[#654177]" : "bg-gray-100"
              }`}
            >
              <Crown className={`w-5 h-5 ${hasMembership ? "text-white" : "text-gray-400"}`} />
            </div>
            <div>
              <p
                className={`text-sm font-semibold font-dm-sans ${
                  hasMembership ? "text-[#8A4BAF]" : "text-gray-500"
                }`}
              >
                {hasMembership ? "Activa" : "Sin"}
              </p>
              <p className="text-xs text-gray-500 font-dm-sans">Membresía</p>
            </div>
          </div>
        </div>
      </div>

      {/* Créditos de Sesión (solo si el usuario tiene membresía) */}
      {hasMembership && <CreditsCard />}

      {/* Próximas Sesiones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Próximas Sesiones</h2>
          <Link
            href="/mi-cuenta/sesiones"
            className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-[#f8f0f5] rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">
                    {booking.resourceName}
                  </p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    {formatDate(booking.scheduledAt!)} - {formatTime(booking.scheduledAt!)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium font-dm-sans ${
                    booking.status === "CONFIRMED"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {booking.status === "CONFIRMED" ? "Confirmada" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans mb-4">No tienes sesiones programadas</p>
            <Link
              href="/sesiones"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
            >
              Explorar Sesiones
            </Link>
          </div>
        )}
      </div>

      {/* Mis Cursos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Mis Cursos</h2>
          <Link
            href="/mi-cuenta/cursos"
            className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {userCourses.length > 0 ? (
          <div className="space-y-3">
            {/* Show courses in progress first, then others */}
            {[...coursesInProgress, ...userCourses.filter(c => !coursesInProgress.includes(c))].slice(0, 3).map((course) => (
              <div
                key={course.courseId}
                className="flex items-center justify-between p-4 bg-[#eef1fa] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#654177] font-dm-sans truncate">
                    {course.courseTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4944a4] rounded-full transition-all"
                        style={{ width: `${Number(course.completionPercentage)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-dm-sans">
                      {Number(course.completionPercentage).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Link
                  href={`/academia/${course.courseSlug}/reproducir`}
                  className="ml-4 px-3 py-1.5 bg-[#4944a4] text-white text-sm rounded-lg hover:bg-[#3d3a8a] transition-colors font-dm-sans"
                >
                  Continuar
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans mb-4">Aún no tienes cursos</p>
            <Link
              href="/academia"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
            >
              Explorar Academia
            </Link>
          </div>
        )}
      </div>

      {/* Próximos Eventos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Próximos Eventos</h2>
          <Link
            href="/mi-cuenta/eventos"
            className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-[#f8f0f5] rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">
                    {booking.resourceName}
                  </p>
                  {booking.scheduledAt && (
                    <p className="text-sm text-gray-500 font-dm-sans">
                      {formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium font-dm-sans ${
                    booking.status === "CONFIRMED"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {booking.status === "CONFIRMED" ? "Confirmado" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans mb-4">No tienes eventos próximos</p>
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
            >
              Explorar Eventos
            </Link>
          </div>
        )}
      </div>

      {/* Últimas Compras */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Últimas Compras</h2>
          <Link
            href="/mi-cuenta/compras"
            className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">{order.itemName}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#8A4BAF] font-dm-sans">
                    ${Number(order.amount).toLocaleString("es-CO")} {order.currency}
                  </p>
                  <span
                    className={`text-xs font-dm-sans ${
                      order.paymentStatus === "COMPLETED"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {order.paymentStatus === "COMPLETED" ? "Pagado" : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans mb-4">Aún no tienes compras</p>
            <Link
              href="/sesiones"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
            >
              Explorar Servicios
            </Link>
          </div>
        )}
      </div>

      {/* CTA Membresía (si no tiene) */}
      {!hasMembership && (
        <div className="bg-gradient-to-r from-[#8A4BAF] to-[#654177] rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <Crown className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="font-gazeta text-xl mb-1">Únete a la Membresía</h3>
              <p className="text-white/80 font-dm-sans text-sm">
                Accede a contenido exclusivo, descuentos en sesiones y más
              </p>
            </div>
            <Link
              href="/membresia"
              className="px-6 py-3 bg-white text-[#8A4BAF] rounded-lg font-dm-sans font-semibold hover:bg-gray-100 transition-colors"
            >
              Conocer más
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
