import { ShoppingBag, Calendar, Receipt, Download } from "lucide-react"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function MisComprasPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/mi-cuenta/compras")
  }

  // Obtener todas las órdenes del usuario
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number | any, currency: string) => {
    const num = typeof amount === "number" ? amount : Number(amount)
    if (currency === "USD") {
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`
    }
    return `$${num.toLocaleString("es-CO")} COP`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            Completado
          </span>
        )
      case "PENDING":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            Pendiente
          </span>
        )
      case "PROCESSING":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Procesando
          </span>
        )
      case "FAILED":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            Fallido
          </span>
        )
      case "REFUNDED":
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            Reembolsado
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {status}
          </span>
        )
    }
  }

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case "SESSION":
        return "Sesión"
      case "MEMBERSHIP":
        return "Membresía"
      case "EVENT":
        return "Evento"
      case "PRODUCT":
        return "Producto"
      case "PREMIUM_CONTENT":
        return "Contenido Premium"
      default:
        return type
    }
  }

  // Calcular totales
  const completedOrders = orders.filter((o) => o.paymentStatus === "COMPLETED")
  const totalSpent = completedOrders.reduce(
    (sum, order) => sum + Number(order.amount),
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="font-gazeta text-3xl text-[#654177] mb-2">Mis Compras</h1>
        <p className="text-gray-600 font-dm-sans">
          Historial de todas tus transacciones
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177] font-dm-sans">
                {orders.length}
              </p>
              <p className="text-sm text-gray-500 font-dm-sans">Total Órdenes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#654177] font-dm-sans">
                {completedOrders.length}
              </p>
              <p className="text-sm text-gray-500 font-dm-sans">Completadas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f8f0f5] rounded-full flex items-center justify-center">
              <span className="text-[#8A4BAF] font-bold font-dm-sans">$</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#654177] font-dm-sans">
                ${totalSpent.toLocaleString("es-CO")}
              </p>
              <p className="text-sm text-gray-500 font-dm-sans">Total Invertido</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Órdenes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-gazeta text-xl text-[#654177] mb-4">Historial de Órdenes</h2>

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-100 rounded-lg p-4 hover:border-[#8A4BAF]/20 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#654177] font-dm-sans">
                        {order.itemName}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-dm-sans">
                        {getOrderTypeLabel(order.orderType)}
                      </span>
                      {getStatusBadge(order.paymentStatus)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-dm-sans">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.createdAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{order.orderNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-[#8A4BAF] font-dm-sans">
                        {formatCurrency(order.amount, order.currency)}
                      </p>
                      <p className="text-xs text-gray-400 font-dm-sans">
                        {order.paymentMethod.replace("_", " ")}
                      </p>
                    </div>

                    {order.paymentStatus === "COMPLETED" && (
                      <button className="p-2 text-gray-400 hover:text-[#8A4BAF] transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-dm-sans mb-2">
              Aún no tienes compras registradas
            </p>
            <p className="text-sm text-gray-400 font-dm-sans">
              Tus compras de sesiones, eventos y membresías aparecerán aquí
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
