'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Clock, Users, Loader2, CheckCircle } from 'lucide-react'

interface WaitlistButtonProps {
  eventId: string
  eventTitle: string
  maxSeats?: number
  className?: string
}

interface WaitlistStatus {
  inWaitlist: boolean
  entry: {
    id: string
    position: number
    seatsRequested: number
    status: 'WAITING' | 'OFFER_PENDING'
    offerExpiresAt: string | null
  } | null
}

export default function WaitlistButton({
  eventId,
  eventTitle,
  maxSeats = 1,
  className = '',
}: WaitlistButtonProps) {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seats, setSeats] = useState(1)

  // Check current waitlist status
  useEffect(() => {
    async function checkWaitlistStatus() {
      if (authStatus === 'loading') return
      if (!session?.user) {
        setCheckingStatus(false)
        return
      }

      try {
        const response = await fetch(`/api/events/${eventId}/waitlist`)
        if (response.ok) {
          const data = await response.json()
          setWaitlistStatus(data)
        }
      } catch (err) {
        console.error('Error checking waitlist status:', err)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkWaitlistStatus()
  }, [eventId, session?.user, authStatus])

  const handleJoinWaitlist = async () => {
    if (!session?.user) {
      // Redirect to login with callback
      router.push(`/auth/signin?callbackUrl=/eventos/${eventId}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al unirse a la lista de espera')
        return
      }

      // Update status
      setWaitlistStatus({
        inWaitlist: true,
        entry: {
          id: data.waitlistEntryId,
          position: data.position,
          seatsRequested: seats,
          status: 'WAITING',
          offerExpiresAt: null,
        },
      })
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveWaitlist = async () => {
    if (!session?.user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/waitlist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al salir de la lista de espera')
        return
      }

      setWaitlistStatus({ inWaitlist: false, entry: null })
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOffer = async () => {
    if (!waitlistStatus?.entry?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/waitlist/${waitlistStatus.entry.id}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al aceptar la oferta')
        return
      }

      // Redirect to payment or confirmation
      if (data.redirectUrl) {
        router.push(data.redirectUrl)
      } else {
        router.push('/mi-cuenta/eventos')
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state
  if (checkingStatus || authStatus === 'loading') {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-[#8A4BAF]" />
      </div>
    )
  }

  // User has an offer pending
  if (waitlistStatus?.inWaitlist && waitlistStatus.entry?.status === 'OFFER_PENDING') {
    const expiresAt = waitlistStatus.entry.offerExpiresAt
      ? new Date(waitlistStatus.entry.offerExpiresAt)
      : null
    const hoursRemaining = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
      : null

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700 font-semibold mb-2">
            <CheckCircle className="w-5 h-5" />
            <span>¡Cupo disponible para ti!</span>
          </div>
          {hoursRemaining !== null && (
            <p className="text-sm text-green-600 mb-3">
              Tienes {hoursRemaining}h para aceptar
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAcceptOffer}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Aceptar cupo'
              )}
            </button>
            <button
              onClick={handleLeaveWaitlist}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    )
  }

  // User is in waitlist (waiting)
  if (waitlistStatus?.inWaitlist && waitlistStatus.entry?.status === 'WAITING') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="bg-[#eef1fa] border border-[#2D4CC7]/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-[#2D4CC7] font-semibold mb-2">
            <Clock className="w-5 h-5" />
            <span>En lista de espera</span>
          </div>
          <p className="text-3xl font-bold text-[#2D4CC7] mb-1">
            #{waitlistStatus.entry.position}
          </p>
          <p className="text-sm text-gray-600 mb-3">
            {waitlistStatus.entry.seatsRequested} cupo(s) solicitado(s)
          </p>
          <button
            onClick={handleLeaveWaitlist}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 mx-auto"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Salir de la lista'
            )}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    )
  }

  // User is not in waitlist - show join button
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
          <Users className="w-5 h-5" />
          <span className="font-semibold">Cupos agotados</span>
        </div>
        <p className="text-sm text-amber-600 mb-4">
          Únete a la lista de espera y te avisaremos cuando haya un cupo disponible.
        </p>

        {maxSeats > 1 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Cupos solicitados:
            </label>
            <select
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-20 mx-auto border border-gray-300 rounded-lg py-2 px-3 text-center"
              disabled={loading}
            >
              {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleJoinWaitlist}
          disabled={loading}
          className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Clock className="w-5 h-5" />
              {session?.user ? 'Unirme a la lista de espera' : 'Inicia sesión para unirte'}
            </>
          )}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  )
}
