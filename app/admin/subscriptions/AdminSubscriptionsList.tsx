'use client'

import {
  Search,
  Filter,
  Eye,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, Fragment } from 'react'

interface SubscriptionData {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  membershipTierName: string
  membershipTierId: string | null
  status: string
  billingInterval: string
  amount: number
  currency: string
  paymentProvider: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt: string | null
  createdAt: string
}

interface AdminSubscriptionsListProps {
  initialSubscriptions: SubscriptionData[]
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED'

export function AdminSubscriptionsList({ initialSubscriptions }: AdminSubscriptionsListProps) {
  const router = useRouter()
  const [subscriptions] = useState(initialSubscriptions)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [expandedSubscription, setExpandedSubscription] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelImmediate, setCancelImmediate] = useState(false)

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const searchMatch =
      searchTerm === '' ||
      sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.membershipTierName.toLowerCase().includes(searchTerm.toLowerCase())

    const statusMatch = statusFilter === 'ALL' || sub.status === statusFilter

    return searchMatch && statusMatch
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number, currency: string, interval: string) => {
    const formatted = currency === 'USD'
      ? `$${amount.toFixed(2)} USD`
      : `$${amount.toLocaleString('es-CO')} COP`
    const intervalLabel = interval === 'MONTHLY' ? '/mes' : '/año'
    return `${formatted}${intervalLabel}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      PAST_DUE: 'bg-red-100 text-red-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
    }
    const labels: Record<string, string> = {
      ACTIVE: 'Activa',
      CANCELLED: 'Cancelada',
      PAST_DUE: 'Con Mora',
      PAUSED: 'Pausada',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTierBadge = (tierName: string) => {
    const lowerName = tierName.toLowerCase()
    let style = 'bg-violet-100 text-violet-700'

    if (lowerName.includes('esencia')) {
      style = 'bg-pink-100 text-pink-700'
    } else if (lowerName.includes('divinidad')) {
      style = 'bg-indigo-100 text-indigo-700'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {tierName}
      </span>
    )
  }

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilEnd <= 7 && daysUntilEnd > 0
  }

  const handleCancelSubscription = async () => {
    if (!showCancelModal) {return}

    setCancellingId(showCancelModal)
    try {
      const response = await fetch(`/api/admin/subscriptions/${showCancelModal}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          immediate: cancelImmediate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al cancelar suscripción')
        return
      }

      alert(data.message || 'Suscripción cancelada exitosamente')
      setShowCancelModal(null)
      setCancelReason('')
      setCancelImmediate(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cancelar suscripción')
    } finally {
      setCancellingId(null)
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
              placeholder="Buscar por email, nombre o plan..."
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
            <option value="ACTIVE">Activas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="PAST_DUE">Con Mora</option>
            <option value="PAUSED">Pausadas</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-dm-sans">
          Mostrando {filteredSubscriptions.length} de {subscriptions.length} suscripciones
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período Actual
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubscriptions.map((sub) => (
                <Fragment key={sub.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedSubscription(expandedSubscription === sub.id ? null : sub.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {expandedSubscription === sub.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-dm-sans">
                            {sub.userName || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {sub.userEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getTierBadge(sub.membershipTierName)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-900 font-dm-sans">
                        {formatAmount(sub.amount, sub.currency, sub.billingInterval)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sub.status)}
                        {sub.status === 'ACTIVE' && isExpiringSoon(sub.currentPeriodEnd) && (
                          <span title="Vence pronto">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-dm-sans">
                        <p className="text-gray-900">
                          {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                        </p>
                        {sub.cancelledAt && (
                          <p className="text-xs text-red-500">
                            Cancelada: {formatDate(sub.cancelledAt)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {sub.status === 'ACTIVE' && (
                          <button
                            onClick={() => setShowCancelModal(sub.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar suscripción"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedSubscription === sub.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-dm-sans">Proveedor de Pago</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {sub.paymentProvider || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Intervalo</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {sub.billingInterval === 'MONTHLY' ? 'Mensual' : 'Anual'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Creada</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {formatDate(sub.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Acciones</p>
                            <Link
                              href={`/admin/subscriptions/${sub.id}`}
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans">No se encontraron suscripciones con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">Cancelar Suscripción</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-dm-sans mb-1">
                  Motivo de cancelación
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ingresa el motivo de la cancelación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="immediate"
                  checked={cancelImmediate}
                  onChange={(e) => setCancelImmediate(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="immediate" className="text-sm text-gray-700 font-dm-sans">
                  <span className="font-medium">Cancelación inmediata</span>
                  <br />
                  <span className="text-gray-500">
                    Si no se marca, el acceso continuará hasta el fin del período actual.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelModal(null)
                  setCancelReason('')
                  setCancelImmediate(false)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-dm-sans transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancellingId === showCancelModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-dm-sans transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancellingId === showCancelModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Cancelación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
