'use client'

import { Calendar, MapPin, Video, Clock, Users, Loader2, CheckCircle, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface WaitlistEntryWithEvent {
  id: string
  eventId: string
  position: number
  seatsRequested: number
  status: 'WAITING' | 'OFFER_PENDING'
  offerExpiresAt: string | null
  createdAt: string
  event: {
    title: string
    slug: string
    eventDate: string
    locationType: 'online' | 'in_person'
    venue?: {
      name?: string
      city?: string
    }
    mainImage?: {
      asset?: {
        url?: string
      }
      alt?: string
    }
  } | null
}

interface WaitlistEntryCardProps {
  entry: WaitlistEntryWithEvent
  onUpdate?: () => void
}

export default function WaitlistEntryCard({ entry, onUpdate }: WaitlistEntryCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate time remaining for offers
  const getTimeRemaining = () => {
    if (!entry.offerExpiresAt) {return null}
    const expiresAt = new Date(entry.offerExpiresAt)
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()

    if (diffMs <= 0) {return 'Expirado'}

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`
    }
    return `${minutes} minutos restantes`
  }

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/waitlist/${entry.id}/accept`, {
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
        router.refresh()
        onUpdate?.()
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/waitlist/${entry.id}/decline`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al rechazar la oferta')
        return
      }

      router.refresh()
      onUpdate?.()
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!entry.event) {return}

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${entry.eventId}/waitlist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al salir de la lista')
        return
      }

      router.refresh()
      onUpdate?.()
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const formatEventDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOfferPending = entry.status === 'OFFER_PENDING'
  const timeRemaining = getTimeRemaining()

  if (!entry.event) {
    return null
  }

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-md border-2 ${
        isOfferPending ? 'border-green-400' : 'border-transparent'
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
          {entry.event.mainImage?.asset?.url ? (
            <Image
              src={entry.event.mainImage.asset.url}
              alt={entry.event.mainImage.alt || entry.event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20 flex items-center justify-center">
              <span className="text-4xl">📅</span>
            </div>
          )}

          {/* Status badge */}
          {isOfferPending ? (
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Cupo disponible
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-[#2D4CC7] text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Posición #{entry.position}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <Link
            href={`/eventos/${entry.event.slug}`}
            className="block hover:text-[#8A4BAF] transition-colors"
          >
            <h3 className="font-gazeta text-lg text-[#654177] mb-2">
              {entry.event.title}
            </h3>
          </Link>

          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8A4BAF]" />
              <span>{formatEventDate(entry.event.eventDate)}</span>
            </div>

            <div className="flex items-center gap-2">
              {entry.event.locationType === 'online' ? (
                <>
                  <Video className="w-4 h-4 text-[#2D4CC7]" />
                  <span>Evento online (Zoom)</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-[#2D4CC7]" />
                  <span>
                    {entry.event.venue?.name || entry.event.venue?.city || 'Presencial'}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{entry.seatsRequested} cupo(s) solicitado(s)</span>
            </div>
          </div>

          {/* Offer pending - show accept/decline buttons */}
          {isOfferPending && (
            <div className="space-y-2">
              {timeRemaining && (
                <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeRemaining}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Aceptar cupo
                    </>
                  )}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Waiting - show position and leave option */}
          {entry.status === 'WAITING' && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Te notificaremos cuando haya un cupo disponible
              </p>
              <button
                onClick={handleLeave}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Salir'
                )}
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
