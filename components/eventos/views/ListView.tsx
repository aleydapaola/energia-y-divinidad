'use client'

import { Calendar, MapPin, Video, Users, Star, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import {
  formatEventDate,
  formatPrice,
  hasAvailableSpots,
  isEarlyBirdActive,
  isEventPast,
} from '@/lib/sanity/queries/events'

import type { Event } from '@/lib/sanity/queries/events'


interface ListViewProps {
  events: Event[]
  showPastEvents?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  canalizacion: 'Canalización',
  meditacion: 'Meditación',
  sanacion: 'Sanación',
  desarrollo_personal: 'Desarrollo Personal',
  espiritualidad: 'Espiritualidad',
  cristales: 'Cristales',
  registros_akashicos: 'Registros Akáshicos',
}

export default function ListView({ events, showPastEvents = false }: ListViewProps) {
  // Separar eventos futuros y pasados
  const futureEvents = events.filter((e) => !isEventPast(e))
  const pastEvents = events.filter((e) => isEventPast(e))

  const renderEventCard = (event: Event, isPast: boolean = false) => {
    const available = hasAvailableSpots(event)
    const isSoldOut = event.status === 'sold_out' || !available
    const isCancelled = event.status === 'cancelled'
    const earlyBird = isEarlyBirdActive(event)

    return (
      <Link
        key={event._id}
        href={`/eventos/${event.slug.current}`}
        className={`group flex flex-col sm:flex-row gap-4 bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all ${
          isPast ? 'opacity-60' : ''
        }`}
      >
        {/* Imagen */}
        <div className="relative w-full sm:w-64 h-48 sm:h-40 flex-shrink-0 bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
          {event.mainImage?.asset?.url ? (
            <Image
              src={event.mainImage.asset.url}
              alt={event.mainImage.alt || event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">📅</span>
            </div>
          )}
          {/* Badges de estado */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isPast && (
              <span className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-white text-xs font-medium rounded">
                <CheckCircle className="w-3 h-3" />
                Finalizado
              </span>
            )}
            {event.featured && !isPast && (
              <span className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded">
                <Star className="w-3 h-3" />
                Destacado
              </span>
            )}
            {event.locationType === 'online' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-[#4944a4] text-white text-xs font-medium rounded">
                <Video className="w-3 h-3" />
                Online
              </span>
            )}
            {isCancelled && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                Cancelado
              </span>
            )}
          </div>
          {/* Precio */}
          {event.price && !isCancelled && (
            <div className="absolute top-2 right-2 bg-white/95 px-2 py-1 rounded text-sm font-semibold text-[#654177]">
              {earlyBird && event.earlyBirdPrice
                ? formatPrice(event.earlyBirdPrice, 'COP')
                : formatPrice(event.price, 'COP')}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Categorías y Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {event.categories?.slice(0, 2).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-[#f8f0f5] text-[#8A4BAF] text-xs font-medium rounded"
                >
                  {CATEGORY_LABELS[cat] || cat}
                </span>
              ))}
              {event.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-[#eef1fa] text-[#4944a4] text-xs font-medium rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Fecha */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar className="w-4 h-4 text-[#8A4BAF]" />
              <span>{formatEventDate(event.eventDate, true)}</span>
            </div>

            {/* Título */}
            <h3 className="font-gazeta text-lg text-[#654177] group-hover:text-[#8A4BAF] transition-colors mb-2 line-clamp-2">
              {event.title}
            </h3>

            {/* Ubicación */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              {event.locationType === 'online' ? (
                <>
                  <Video className="w-4 h-4 text-[#8A4BAF]" />
                  <span>Online (Zoom)</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-[#8A4BAF]" />
                  <span>{event.venue?.city || event.venue?.name || 'Presencial'}</span>
                </>
              )}
            </div>
          </div>

          {/* Footer: Cupos y botón */}
          <div className="flex items-center justify-between mt-2">
            {/* Cupos - solo mostrar si hay capacidad definida */}
            {event.capacity && event.capacity > 0 && !isCancelled && !isPast && (
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-4 h-4" />
                <span
                  className={`font-medium ${
                    isSoldOut ? 'text-red-500' : 'text-green-600'
                  }`}
                >
                  {isSoldOut
                    ? 'Agotado'
                    : typeof event.availableSpots === 'number' && event.availableSpots >= 0
                    ? `${event.availableSpots} cupos`
                    : `${event.capacity} cupos`}
                </span>
              </div>
            )}
            {/* Mensaje para eventos sin límite de cupos */}
            {!event.capacity && !isCancelled && !isPast && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Users className="w-4 h-4" />
                <span className="font-medium">Cupos disponibles</span>
              </div>
            )}

            {/* Botón */}
            {!isCancelled && !isPast && (
              <span
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSoldOut
                    ? 'bg-gray-200 text-gray-500'
                    : 'bg-[#4944a4] text-white group-hover:bg-[#3d3a8a]'
                }`}
              >
                {isSoldOut ? 'Agotado' : 'Reservar'}
              </span>
            )}

            {isPast && event.recording?.url && (
              <span className="px-4 py-2 bg-[#4944a4] text-white rounded-lg text-sm font-medium">
                Ver Grabación
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-4">
      {/* Eventos futuros */}
      {futureEvents.map((event) => renderEventCard(event, false))}

      {/* Separador para eventos pasados */}
      {showPastEvents && pastEvents.length > 0 && futureEvents.length > 0 && (
        <div className="flex items-center gap-4 py-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500 font-medium">Eventos Pasados</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* Eventos pasados */}
      {showPastEvents && pastEvents.map((event) => renderEventCard(event, true))}

      {/* Sin eventos */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron eventos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  )
}
