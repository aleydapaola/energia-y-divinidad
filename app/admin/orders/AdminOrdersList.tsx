'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Filter,
  Eye,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'

interface OrderData {
  id: string
  orderNumber: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  orderType: string
  itemName: string
  amount: number
  currency: string
  paymentMethod: string | null
  paymentStatus: string
  discountCode: string | null
  discountAmount: number | null
  createdAt: string
}

interface AdminOrdersListProps {
  initialOrders: OrderData[]
}

type StatusFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
type TypeFilter = 'ALL' | 'SESSION' | 'EVENT' | 'MEMBERSHIP' | 'COURSE' | 'PREMIUM_CONTENT' | 'PRODUCT'
type CurrencyFilter = 'ALL' | 'COP' | 'USD'

export function AdminOrdersList({ initialOrders }: AdminOrdersListProps) {
  const router = useRouter()
  const [orders] = useState(initialOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const searchMatch =
      searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.itemName.toLowerCase().includes(searchTerm.toLowerCase())

    const statusMatch = statusFilter === 'ALL' || order.paymentStatus === statusFilter
    const typeMatch = typeFilter === 'ALL' || order.orderType === typeFilter
    const currencyMatch = currencyFilter === 'ALL' || order.currency === currencyFilter

    return searchMatch && statusMatch && typeMatch && currencyMatch
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)} USD`
    }
    return `$${amount.toLocaleString('es-CO')} COP`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-purple-100 text-purple-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      PROCESSING: 'Procesando',
      COMPLETED: 'Completado',
      FAILED: 'Fallido',
      REFUNDED: 'Reembolsado',
      CANCELLED: 'Cancelado',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      SESSION: 'bg-violet-100 text-violet-700',
      EVENT: 'bg-pink-100 text-pink-700',
      MEMBERSHIP: 'bg-indigo-100 text-indigo-700',
      COURSE: 'bg-cyan-100 text-cyan-700',
      PREMIUM_CONTENT: 'bg-amber-100 text-amber-700',
      PRODUCT: 'bg-emerald-100 text-emerald-700',
    }
    const labels: Record<string, string> = {
      SESSION: 'Sesión',
      EVENT: 'Evento',
      MEMBERSHIP: 'Membresía',
      COURSE: 'Curso',
      PREMIUM_CONTENT: 'Contenido',
      PRODUCT: 'Producto',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    )
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A'
    const labels: Record<string, string> = {
      WOMPI_CARD: 'Tarjeta (Wompi)',
      WOMPI_NEQUI: 'Nequi',
      WOMPI_PSE: 'PSE',
      EPAYCO_CARD: 'Tarjeta (ePayco)',
      EPAYCO_PAYPAL: 'PayPal',
      EPAYCO_PSE: 'PSE (ePayco)',
      STRIPE: 'Stripe',
      MANUAL_NEQUI: 'Nequi (Manual)',
      MANUAL_TRANSFER: 'Transferencia',
      FREE: 'Gratis',
    }
    return labels[method] || method
  }

  const handleResendEmail = async (orderId: string) => {
    setResendingEmail(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/resend-confirmation`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al reenviar email')
        return
      }

      alert(data.message || 'Email reenviado exitosamente')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al reenviar email')
    } finally {
      setResendingEmail(null)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por orden, email, nombre o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="COMPLETED">Completado</option>
            <option value="FAILED">Fallido</option>
            <option value="REFUNDED">Reembolsado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="SESSION">Sesiones</option>
            <option value="EVENT">Eventos</option>
            <option value="MEMBERSHIP">Membresías</option>
            <option value="COURSE">Cursos</option>
            <option value="PREMIUM_CONTENT">Contenido</option>
            <option value="PRODUCT">Productos</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as CurrencyFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todas las monedas</option>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-dm-sans">
          Mostrando {filteredOrders.length} de {orders.length} órdenes
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {expandedOrder === order.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-[#654177] font-dm-sans">
                          {order.orderNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 font-dm-sans">
                          {order.userName || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500 font-dm-sans">
                          {order.userEmail || 'Sin email'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {getTypeBadge(order.orderType)}
                        <span className="text-sm text-gray-700 font-dm-sans truncate max-w-[200px]">
                          {order.itemName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-900 font-dm-sans">
                        {formatAmount(order.amount, order.currency)}
                      </span>
                      {order.discountCode && (
                        <p className="text-xs text-green-600 font-dm-sans">
                          -{formatAmount(order.discountAmount || 0, order.currency)} ({order.discountCode})
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(order.paymentStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500 font-dm-sans">
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {order.paymentStatus === 'COMPLETED' && (
                          <button
                            onClick={() => handleResendEmail(order.id)}
                            disabled={resendingEmail === order.id}
                            className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors disabled:opacity-50"
                            title="Reenviar confirmación"
                          >
                            {resendingEmail === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-expanded`}>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-dm-sans">Método de pago</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {getPaymentMethodLabel(order.paymentMethod)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Moneda</p>
                            <p className="font-medium text-gray-900 font-dm-sans">{order.currency}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">ID Usuario</p>
                            <p className="font-medium text-gray-900 font-dm-sans truncate">
                              {order.userId || 'Invitado'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Acciones</p>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="text-[#8A4BAF] hover:underline font-dm-sans flex items-center gap-1"
                            >
                              Ver detalle completo
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans">No se encontraron órdenes con los filtros aplicados</p>
          </div>
        )}
      </div>
    </>
  )
}
