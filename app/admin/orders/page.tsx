import { prisma } from "@/lib/prisma"
import { AdminOrdersList } from "./AdminOrdersList"

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serializedOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    userName: o.user?.name,
    userEmail: o.user?.email || o.guestEmail,
    orderType: o.orderType,
    itemName: o.itemName,
    amount: Number(o.amount),
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    discountCode: o.discountCode,
    discountAmount: o.discountAmount ? Number(o.discountAmount) : null,
    createdAt: o.createdAt.toISOString(),
  }))

  // Calcular totales
  const totals = {
    COP: orders
      .filter((o) => o.currency === 'COP' && o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.amount), 0),
    USD: orders
      .filter((o) => o.currency === 'USD' && o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.amount), 0),
    count: orders.filter((o) => o.paymentStatus === 'COMPLETED').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Ventas</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra todas las compras y pagos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Ventas Completadas</p>
          <p className="text-2xl font-semibold text-[#654177]">{totals.count}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Total COP</p>
          <p className="text-2xl font-semibold text-green-600">
            ${totals.COP.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Total USD</p>
          <p className="text-2xl font-semibold text-blue-600">
            ${totals.USD.toFixed(2)}
          </p>
        </div>
      </div>

      <AdminOrdersList initialOrders={serializedOrders} />
    </div>
  )
}
