'use client'

import { useState } from 'react'
import { Calendar, Clock, Video, AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react'

interface BookingData {
  id: string
  resourceName: string
  status: string
  scheduledAt: Date | null
  duration: number | null
  rescheduleCount: number
}

interface BookingCardProps {
  booking: BookingData
  onUpdate: () => void
}

export function BookingCard({ booking, onUpdate }: BookingCardProps) {
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Confirmada</span>
      case 'PENDING':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pendiente</span>
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Completada</span>
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelada</span>
      case 'NO_SHOW':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">No asistió</span>
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>
    }
  }

  // Check if can be rescheduled (at least 24h before, less than 2 reschedules)
  const canReschedule = () => {
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) return false
    if (booking.rescheduleCount >= 2) return false
    if (!booking.scheduledAt) return true
    const hoursUntil = (new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntil >= 24
  }

  // Check if can be cancelled (at least 24h before)
  const canCancel = () => {
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) return false
    if (!booking.scheduledAt) return true
    const hoursUntil = (new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursUntil >= 24
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      setError('Por favor selecciona fecha y hora')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newDateTime = new Date(`${newDate}T${newTime}:00`)

      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: newDateTime.toISOString(),
          reason: reason || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reprogramar')
      }

      setShowRescheduleModal(false)
      setNewDate('')
      setNewTime('')
      setReason('')
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar')
      }

      setShowCancelModal(false)
      setReason('')
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date for reschedule (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <>
      <div className="border border-[#8A4BAF]/20 rounded-lg p-4 bg-[#f8f0f5]/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#654177] font-dm-sans">
                {booking.resourceName}
              </h3>
              {getStatusBadge(booking.status)}
              {booking.rescheduleCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                  Reprogramada {booking.rescheduleCount}x
                </span>
              )}
            </div>

            {booking.scheduledAt && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 font-dm-sans">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-[#8A4BAF]" />
                  {formatDate(booking.scheduledAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[#8A4BAF]" />
                  {formatTime(booking.scheduledAt)}
                </span>
                {booking.duration && (
                  <span className="text-gray-400">
                    ({booking.duration} min)
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-sm text-gray-500 font-dm-sans">
              <Video className="w-4 h-4" />
              Sesión por videollamada
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {booking.status === 'CONFIRMED' && (
              <button className="px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors">
                Unirse a Sesión
              </button>
            )}

            {canReschedule() && (
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="flex items-center gap-1 px-3 py-2 border border-[#8A4BAF] text-[#8A4BAF] rounded-lg font-dm-sans text-sm hover:bg-[#8A4BAF] hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reprogramar
              </button>
            )}

            {canCancel() && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg font-dm-sans text-sm hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}

            {booking.status === 'PENDING' && (
              <span className="flex items-center gap-1 text-sm text-yellow-600 font-dm-sans">
                <AlertCircle className="w-4 h-4" />
                Pendiente de confirmación
              </span>
            )}
          </div>
        </div>

        {/* Warning if approaching 24h limit */}
        {booking.scheduledAt && (
          (() => {
            const hoursUntil = (new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60)
            if (hoursUntil > 24 && hoursUntil <= 48) {
              return (
                <p className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg font-dm-sans">
                  Tienes hasta 24h antes de la sesión para reprogramar o cancelar sin costo.
                </p>
              )
            }
            return null
          })()
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">
              Reprogramar Sesión
            </h3>

            <p className="text-sm text-gray-600 mb-4 font-dm-sans">
              Selecciona una nueva fecha y hora para tu sesión.
              {booking.rescheduleCount === 1 && (
                <span className="block mt-1 text-amber-600">
                  Esta será tu última reprogramación disponible.
                </span>
              )}
            </p>

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
                  Motivo (opcional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="¿Por qué necesitas reprogramar?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRescheduleModal(false)
                  setError(null)
                  setNewDate('')
                  setNewTime('')
                  setReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-dm-sans hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={loading || !newDate || !newTime}
                className="flex-1 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-red-600 mb-4">
              Cancelar Sesión
            </h3>

            <p className="text-sm text-gray-600 mb-4 font-dm-sans">
              ¿Estás segura de que deseas cancelar esta sesión? Esta acción no se puede deshacer.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-[#f8f0f5] p-4 rounded-lg mb-4">
              <p className="font-medium text-[#654177]">{booking.resourceName}</p>
              {booking.scheduledAt && (
                <p className="text-sm text-gray-600">
                  {formatDate(booking.scheduledAt)} - {formatTime(booking.scheduledAt)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="¿Por qué necesitas cancelar?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setError(null)
                  setReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-dm-sans hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-dm-sans hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </>
  )
}
