'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  User,
  Mail,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface BookingData {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  resourceName: string
  bookingType: string
  status: string
  scheduledAt: string | null
  duration: number | null
  paymentStatus: string | null
  paymentMethod: string | null
  amount: number | null
  currency: string | null
  rescheduleCount: number
  cancellationReason: string | null
  adminNotes: string | null
  createdAt: string
}

interface AdminBookingsListProps {
  initialBookings: BookingData[]
}

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
type TimeFilter = 'ALL' | 'UPCOMING' | 'PAST' | 'TODAY'

export function AdminBookingsList({ initialBookings }: AdminBookingsListProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('UPCOMING')
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)

  // Modal states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [reason, setReason] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const searchMatch =
      searchTerm === '' ||
      booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.resourceName.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const statusMatch = statusFilter === 'ALL' || booking.status === statusFilter

    // Time filter
    let timeMatch = true
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (booking.scheduledAt) {
      const scheduledDate = new Date(booking.scheduledAt)
      if (timeFilter === 'UPCOMING') {
        timeMatch = scheduledDate >= now && booking.status !== 'CANCELLED'
      } else if (timeFilter === 'PAST') {
        timeMatch = scheduledDate < now
      } else if (timeFilter === 'TODAY') {
        timeMatch = scheduledDate >= today && scheduledDate < tomorrow
      }
    } else if (timeFilter !== 'ALL') {
      timeMatch = false
    }

    return searchMatch && statusMatch && timeMatch
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
      NO_SHOW: 'bg-gray-100 text-gray-700',
      PENDING_PAYMENT: 'bg-orange-100 text-orange-700',
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
      PENDING_PAYMENT: 'Pago pendiente',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const openRescheduleModal = (booking: BookingData) => {
    setSelectedBooking(booking)
    setShowRescheduleModal(true)
    setError(null)
    setNewDate('')
    setNewTime('')
    setReason('')
  }

  const openCancelModal = (booking: BookingData) => {
    setSelectedBooking(booking)
    setShowCancelModal(true)
    setError(null)
    setReason('')
  }

  const openStatusModal = (booking: BookingData) => {
    setSelectedBooking(booking)
    setNewStatus(booking.status)
    setShowStatusModal(true)
    setError(null)
  }

  const handleReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) {
      setError('Por favor selecciona fecha y hora')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newDateTime = new Date(`${newDate}T${newTime}:00`)

      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: newDateTime.toISOString(),
          reason: reason || 'Reprogramada por Aleyda',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reprogramar')
      }

      setShowRescheduleModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedBooking) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || 'Cancelada por administrador',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar')
      }

      setShowCancelModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedBooking || !newStatus) return

    setLoading(true)
    setError(null)

    try {
      // Usar endpoint específico según el nuevo estado
      let endpoint = ''
      switch (newStatus) {
        case 'COMPLETED':
          endpoint = `/api/admin/bookings/${selectedBooking.id}/complete`
          break
        case 'NO_SHOW':
          endpoint = `/api/admin/bookings/${selectedBooking.id}/no-show`
          break
        case 'CANCELLED':
          endpoint = `/api/admin/bookings/${selectedBooking.id}/cancel`
          break
        default:
          // Fallback al endpoint genérico de status
          endpoint = `/api/admin/bookings/${selectedBooking.id}/status`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar estado')
      }

      setShowStatusModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o sesión..."
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
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="NO_SHOW">No asistió</option>
          </select>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todas las fechas</option>
            <option value="TODAY">Hoy</option>
            <option value="UPCOMING">Próximas</option>
            <option value="PAST">Pasadas</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mt-3 font-dm-sans">
          Mostrando {filteredBookings.length} de {bookings.length} sesiones
        </p>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="hover:bg-gray-50">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#f8f0f5] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#654177] font-dm-sans">
                          {booking.userName || booking.userEmail}
                        </p>
                        <p className="text-sm text-gray-500 font-dm-sans">
                          {booking.resourceName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {booking.scheduledAt && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#654177] font-dm-sans">
                            {formatDate(booking.scheduledAt)}
                          </p>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {formatTime(booking.scheduledAt)}
                          </p>
                        </div>
                      )}
                      {getStatusBadge(booking.status)}
                      {expandedBooking === booking.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedBooking === booking.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm font-dm-sans">
                        <p className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          {booking.userEmail}
                        </p>
                        {booking.duration && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            Duración: {booking.duration} min
                          </p>
                        )}
                        {booking.rescheduleCount > 0 && (
                          <p className="text-amber-600">
                            Reprogramada {booking.rescheduleCount} vez(es)
                          </p>
                        )}
                        {booking.cancellationReason && (
                          <p className="text-red-600">
                            Motivo cancelación: {booking.cancellationReason}
                          </p>
                        )}
                        {booking.adminNotes && (
                          <p className="text-gray-600">
                            Notas: {booking.adminNotes}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm font-dm-sans">
                        {booking.amount && (
                          <p className="text-gray-600">
                            Monto: {booking.currency === 'COP'
                              ? `$${booking.amount.toLocaleString('es-CO')} COP`
                              : `$${booking.amount} USD`}
                          </p>
                        )}
                        {booking.paymentMethod && (
                          <p className="text-gray-600">
                            Método: {booking.paymentMethod}
                          </p>
                        )}
                        {booking.paymentStatus && (
                          <p className="text-gray-600">
                            Pago: {booking.paymentStatus}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs">
                          Creada: {formatDate(booking.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openStatusModal(booking)
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-[#4944a4] text-white rounded-lg text-sm hover:bg-[#3d3a8a] transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Cambiar Estado
                      </button>

                      {['CONFIRMED', 'PENDING'].includes(booking.status) && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openRescheduleModal(booking)
                            }}
                            className="flex items-center gap-1 px-3 py-2 border border-[#8A4BAF] text-[#8A4BAF] rounded-lg text-sm hover:bg-[#8A4BAF] hover:text-white transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reprogramar
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openCancelModal(booking)
                            }}
                            className="flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-dm-sans">
              No se encontraron sesiones con los filtros seleccionados
            </p>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">
              Reprogramar Sesión
            </h3>

            <div className="bg-[#f8f0f5] p-3 rounded-lg mb-4">
              <p className="font-medium text-[#654177] text-sm">
                {selectedBooking.userName || selectedBooking.userEmail}
              </p>
              <p className="text-xs text-gray-600">{selectedBooking.resourceName}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva fecha
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={getMinDate()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva hora
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (se enviará al cliente)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo de la reprogramación"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={loading || !newDate || !newTime}
                className="flex-1 px-4 py-2 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reprogramando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-red-600 mb-4">
              Cancelar Sesión
            </h3>

            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="font-medium text-red-700 text-sm">
                {selectedBooking.userName || selectedBooking.userEmail}
              </p>
              <p className="text-xs text-red-600">{selectedBooking.resourceName}</p>
              {selectedBooking.scheduledAt && (
                <p className="text-xs text-red-600">
                  {formatDate(selectedBooking.scheduledAt)} - {formatTime(selectedBooking.scheduledAt)}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de cancelación (se enviará al cliente)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo de la cancelación"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, Cancelar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">
              Cambiar Estado
            </h3>

            <div className="bg-[#f8f0f5] p-3 rounded-lg mb-4">
              <p className="font-medium text-[#654177] text-sm">
                {selectedBooking.userName || selectedBooking.userEmail}
              </p>
              <p className="text-xs text-gray-600">{selectedBooking.resourceName}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuevo estado
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              >
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="COMPLETED">Completada</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="NO_SHOW">No asistió</option>
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={loading || newStatus === selectedBooking.status}
                className="flex-1 px-4 py-2 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
