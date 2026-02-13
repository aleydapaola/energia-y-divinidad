import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Ticket,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"

import { getDashboardSummary } from "@/lib/admin-stats"

export default async function AdminDashboardPage() {
  const { sales, alerts, bookings, users, events, upcomingSessions } = await getDashboardSummary()

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number, currency: "COP" | "USD") => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)} USD`
    }
    return `$${amount.toLocaleString("es-CO")} COP`
  }

  const hasAlerts = alerts.failedPayments > 0 || alerts.recentCancellations > 0 || alerts.pendingBookings > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Dashboard</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Bienvenida al panel de administración
        </p>
      </div>

      {/* Alerts Panel */}
      {hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-amber-800 font-dm-sans">Alertas</h3>
          </div>
          <ul className="space-y-1 text-sm text-amber-700 font-dm-sans">
            {alerts.failedPayments > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                {alerts.failedPayments} pago(s) fallido(s) en las últimas 24h
              </li>
            )}
            {alerts.recentCancellations > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                {alerts.recentCancellations} cancelación(es) en las últimas 24h
              </li>
            )}
            {alerts.pendingBookings > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                {alerts.pendingBookings} sesión(es) pendiente(s) de confirmar
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Sales Stats */}
      <div>
        <h2 className="font-gazeta text-xl text-[#654177] mb-4">Ventas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ventas Hoy COP */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">
                  {formatCurrency(sales.today.COP, "COP")}
                </p>
                <p className="text-sm text-gray-500 font-dm-sans">Hoy (COP)</p>
              </div>
            </div>
            {sales.today.USD > 0 && (
              <p className="mt-2 text-sm text-gray-500 font-dm-sans">
                + {formatCurrency(sales.today.USD, "USD")}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 font-dm-sans">
              {sales.today.count} orden(es)
            </p>
          </div>

          {/* Ventas 7 días COP */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">
                  {formatCurrency(sales.week.COP, "COP")}
                </p>
                <p className="text-sm text-gray-500 font-dm-sans">Últimos 7 días (COP)</p>
              </div>
            </div>
            {sales.week.USD > 0 && (
              <p className="mt-2 text-sm text-gray-500 font-dm-sans">
                + {formatCurrency(sales.week.USD, "USD")}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 font-dm-sans">
              {sales.week.count} orden(es)
            </p>
          </div>

          {/* Suscripciones Activas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">
                  {users.activeSubscriptions}
                </p>
                <p className="text-sm text-gray-500 font-dm-sans">Membresías activas</p>
              </div>
            </div>
          </div>

          {/* Total Usuarios */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{users.totalUsers}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Usuarios</p>
              </div>
            </div>
            {users.newUsersThisMonth > 0 && (
              <p className="mt-2 text-sm text-green-600 font-dm-sans">
                +{users.newUsersThisMonth} este mes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Stats */}
      <div>
        <h2 className="font-gazeta text-xl text-[#654177] mb-4">Sesiones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#f8f0f5] rounded-lg">
                <Calendar className="w-6 h-6 text-[#8A4BAF]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{bookings.total}</p>
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
                <p className="text-2xl font-semibold text-[#654177]">{bookings.upcoming}</p>
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
                <p className="text-2xl font-semibold text-[#654177]">{bookings.pending}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{bookings.completedThisMonth}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Completadas (mes)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Stats */}
      <div>
        <h2 className="font-gazeta text-xl text-[#654177] mb-4">Eventos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-50 rounded-lg">
                <Ticket className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{events.totalEventOrders}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Entradas vendidas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-lg">
                <CalendarDays className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{events.eventOrdersThisMonth}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Entradas este mes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-fuchsia-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-fuchsia-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">
                  {formatCurrency(events.eventRevenueThisMonth.COP, "COP")}
                </p>
                <p className="text-sm text-gray-500 font-dm-sans">Ingresos eventos (mes)</p>
              </div>
            </div>
            {events.eventRevenueThisMonth.USD > 0 && (
              <p className="mt-2 text-sm text-gray-500 font-dm-sans">
                + {formatCurrency(events.eventRevenueThisMonth.USD, "USD")}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#654177]">{events.upcomingEvents.length}</p>
                <p className="text-sm text-gray-500 font-dm-sans">Eventos con ventas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Sales Breakdown */}
        {events.upcomingEvents.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium text-[#654177] mb-3 font-dm-sans">Ventas por evento</h3>
            <div className="space-y-3">
              {events.upcomingEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-pink-50/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-[#654177] font-dm-sans">{event.eventName}</p>
                    <p className="text-sm text-gray-500 font-dm-sans">
                      {event.ticketsSold} entrada(s) vendida(s)
                    </p>
                  </div>
                  <p className="font-semibold text-[#654177] font-dm-sans">
                    {formatCurrency(event.revenue, event.currency as "COP" | "USD")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
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

        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-[#f8f0f5]/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">
                    {session.userName || session.userEmail}
                  </p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    {session.resourceName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#654177] font-dm-sans">
                    {formatDateTime(session.scheduledAt)}
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
