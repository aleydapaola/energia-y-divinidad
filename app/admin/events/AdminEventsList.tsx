'use client'

import {
  Search,
  Filter,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Ticket,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, Fragment } from 'react'

interface EventOrderData {
  id: string
  orderNumber: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  eventName: string
  eventId: string | null
  amount: number
  currency: string
  paymentMethod: string | null
  paymentStatus: string
  createdAt: string
}

interface AdminEventsListProps {
  initialOrders: EventOrderData[]
}

type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export function AdminEventsList({ initialOrders }: AdminEventsListProps) {
  const router = useRouter()
  const [orders] = useState(initialOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [eventFilter, setEventFilter] = useState<string>('ALL')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  // Get unique events for filter
  const uniqueEvents = Array.from(new Set(orders.map((o) => o.eventName)))

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const searchMatch =
      searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.eventName.toLowerCase().includes(searchTerm.toLowerCase())

    const statusMatch = statusFilter === 'ALL' || order.paymentStatus === statusFilter
    const eventMatch = eventFilter === 'ALL' || order.eventName === eventFilter

    return searchMatch && statusMatch && eventMatch
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
      CANCELLED: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      PROCESSING: 'Procesando',
      COMPLETED: 'Confirmado',
      FAILED: 'Fallido',
      CANCELLED: 'Cancelado',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) {return 'N/A'}
    const labels: Record<string, string> = {
      WOMPI_CARD: 'Tarjeta (Wompi)',
      WOMPI_NEQUI: 'Nequi',
      WOMPI_PSE: 'PSE',
      EPAYCO_CARD: 'Tarjeta (ePayco)',
      EPAYCO_PAYPAL: 'PayPal',
      EPAYCO_PSE: 'PSE (ePayco)',
      STRIPE: 'Stripe',
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
              placeholder="Buscar por orden, email, nombre o evento..."
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
            <option value="COMPLETED">Confirmado</option>
            <option value="FAILED">Fallido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los eventos</option>
            {uniqueEvents.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-dm-sans">
          Mostrando {filteredOrders.length} de {orders.length} entradas
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asistente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evento
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
                <Fragment key={order.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {expandedOrder === order.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="p-2 bg-pink-50 rounded-full">
                          <User className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-dm-sans">
                            {order.userName || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {order.userEmail || 'Sin email'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-gray-700 font-dm-sans">
                          {order.eventName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-900 font-dm-sans">
                        {formatAmount(order.amount, order.currency)}
                      </span>
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
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-dm-sans">Número de orden</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {order.orderNumber}
                            </p>
                          </div>
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
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans">No se encontraron entradas con los filtros aplicados</p>
          </div>
        )}
      </div>
    </>
  )
}
