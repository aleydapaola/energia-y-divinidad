import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin, Users, Video } from "lucide-react"
import type { Event } from "@/lib/sanity/queries/events"
import {
  getEventTypeLabel,
  formatEventDate,
  hasAvailableSpots,
  isEarlyBirdActive,
  formatPrice,
  getTimeUntilEvent,
} from "@/lib/sanity/queries/events"

interface EventCardProps {
  event: Event
}

export default function EventCard({ event }: EventCardProps) {
  const available = hasAvailableSpots(event)
  const isSoldOut = event.status === 'sold_out' || !available
  const isPast = event.status === 'completed'
  const isCancelled = event.status === 'cancelled'
  const earlyBird = isEarlyBirdActive(event)
  const timeUntil = getTimeUntilEvent(event)

  // Determine badge
  let badge = null
  if (isCancelled) {
    badge = (
      <span className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
        Cancelado
      </span>
    )
  } else if (isSoldOut) {
    badge = (
      <span className="absolute top-4 right-4 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
        Agotado
      </span>
    )
  } else if (event.includedInMembership) {
    badge = (
      <span className="absolute top-4 right-4 bg-[#8A4BAF] text-white px-3 py-1 rounded-full text-xs font-semibold">
        Incluido en Membresía
      </span>
    )
  } else if (earlyBird) {
    badge = (
      <span className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
        Early Bird
      </span>
    )
  }

  // Featured badge
  const featuredBadge = event.featured && !isCancelled && !isSoldOut && (
    <span className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
      Destacado
    </span>
  )

  return (
    <Link
      href={`/eventos/${event.slug.current}`}
      className={`group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${
        (isSoldOut || isPast || isCancelled) ? 'opacity-75' : ''
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={event.mainImage.asset.url}
          alt={event.mainImage.alt || event.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {badge}
        {featuredBadge}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Event Type and Time Badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#8A4BAF]/10 text-[#8A4BAF] text-xs font-medium rounded-full">
            {event.locationType === 'online' && <Video className="w-3 h-3" />}
            {event.locationType === 'in_person' && <MapPin className="w-3 h-3" />}
            {getEventTypeLabel(event.eventType)}
          </span>
          {!isPast && !isCancelled && (
            <span className="inline-flex items-center px-3 py-1 bg-[#eef1fa] text-[#4944a4] text-xs font-medium rounded-full">
              {timeUntil}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-gazeta text-xl text-[#654177] mb-3 group-hover:text-[#8A4BAF] transition-colors line-clamp-2">
          {event.title}
        </h3>

        {/* Date */}
        <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
          <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#8A4BAF]" />
          <span>{formatEventDate(event.eventDate, true)}</span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
          {event.locationType === 'online' ? (
            <>
              <Video className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#8A4BAF]" />
              <span>Evento Online (Zoom)</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#8A4BAF]" />
              <span>{event.venue?.city || event.venue?.name || 'Presencial'}</span>
            </>
          )}
        </div>

        {/* Capacity */}
        {event.capacity && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Users className="w-4 h-4 flex-shrink-0 text-[#8A4BAF]" />
            <span>
              {event.availableSpots !== undefined
                ? `${event.availableSpots} cupos disponibles`
                : `Capacidad: ${event.capacity} personas`}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            {event.includedInMembership ? (
              <span className="text-sm text-[#8A4BAF] font-medium">Gratis para miembros</span>
            ) : event.price ? (
              <div className="flex flex-col">
                {earlyBird && event.earlyBirdPrice ? (
                  <>
                    <span className="text-xl font-bold text-[#8A4BAF]">
                      {formatPrice(event.earlyBirdPrice, 'COP')}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(event.price, 'COP')}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-[#8A4BAF]">
                    {formatPrice(event.price, 'COP')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">Precio por confirmar</span>
            )}
          </div>

          {!isCancelled && !isPast && (
            <span
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSoldOut
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-[#4944a4] text-white group-hover:bg-[#3d3a8a]'
              }`}
            >
              {isSoldOut ? 'Agotado' : 'Ver Detalles'}
            </span>
          )}

          {isPast && event.recording?.url && (
            <span className="px-5 py-2 rounded-lg text-sm font-medium bg-[#4944a4] text-white">
              Ver Grabación
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
