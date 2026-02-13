import { prisma } from "@/lib/prisma"

import { AdminEventsList } from "./AdminEventsList"

export default async function AdminEventsPage() {
  // Obtener órdenes de eventos
  const eventOrders = await prisma.order.findMany({
    where: {
      orderType: 'EVENT',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serializedOrders = eventOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    userName: o.user?.name || null,
    userEmail: o.user?.email || o.guestEmail,
    eventName: o.itemName,
    eventId: o.itemId,
    amount: Number(o.amount),
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt.toISOString(),
  }))

  // Calcular totales
  const totals = {
    COP: eventOrders
      .filter((o) => o.currency === 'COP' && o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.amount), 0),
    USD: eventOrders
      .filter((o) => o.currency === 'USD' && o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.amount), 0),
    ticketsSold: eventOrders.filter((o) => o.paymentStatus === 'COMPLETED').length,
    pending: eventOrders.filter((o) => o.paymentStatus === 'PENDING').length,
  }

  // Agrupar por evento
  const eventSummary = new Map<string, { name: string; ticketsSold: number; revenue: number; currency: string }>()
  for (const order of eventOrders.filter((o) => o.paymentStatus === 'COMPLETED')) {
    const existing = eventSummary.get(order.itemName) || {
      name: order.itemName,
      ticketsSold: 0,
      revenue: 0,
      currency: order.currency,
    }
    existing.ticketsSold++
    existing.revenue += Number(order.amount)
    eventSummary.set(order.itemName, existing)
  }

  const eventStats = Array.from(eventSummary.values()).sort((a, b) => b.ticketsSold - a.ticketsSold)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Eventos</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra las entradas vendidas y asistentes a eventos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Entradas Vendidas</p>
          <p className="text-2xl font-semibold text-[#654177]">{totals.ticketsSold}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Pendientes de pago</p>
          <p className="text-2xl font-semibold text-yellow-600">{totals.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Ingresos COP</p>
          <p className="text-2xl font-semibold text-green-600">
            ${totals.COP.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Ingresos USD</p>
          <p className="text-2xl font-semibold text-blue-600">
            ${totals.USD.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Event Breakdown */}
      {eventStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] mb-4">Resumen por Evento</h2>
          <div className="space-y-3">
            {eventStats.map((event, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-pink-50/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">{event.name}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">
                    {event.ticketsSold} entrada(s) vendida(s)
                  </p>
                </div>
                <p className="font-semibold text-[#654177] font-dm-sans">
                  ${event.currency === 'USD' ? event.revenue.toFixed(2) : event.revenue.toLocaleString('es-CO')} {event.currency}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminEventsList initialOrders={serializedOrders} />
    </div>
  )
}
