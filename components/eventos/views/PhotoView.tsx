'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Video, Star } from 'lucide-react'
import type { Event } from '@/lib/sanity/queries/events'
import { formatPrice, isEarlyBirdActive, isEventPast } from '@/lib/sanity/queries/events'

interface PhotoViewProps {
  events: Event[]
}

export default function PhotoView({ events }: PhotoViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {events.map((event) => {
        const isPast = isEventPast(event)
        const earlyBird = isEarlyBirdActive(event)
        const isCancelled = event.status === 'cancelled'

        return (
          <Link
            key={event._id}
            href={`/eventos/${event.slug.current}`}
            className={`
              group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all
              ${isPast ? 'opacity-60' : ''}
            `}
          >
            {/* Imagen */}
            <div className="relative aspect-square">
              <Image
                src={event.mainImage.asset.url}
                alt={event.mainImage.alt || event.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Overlay con gradiente */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
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
                {isPast && !isCancelled && (
                  <span className="px-2 py-1 bg-gray-700 text-white text-xs font-medium rounded">
                    Finalizado
                  </span>
                )}
              </div>

              {/* Precio */}
              {event.price && !isCancelled && (
                <div className="absolute top-3 right-3 bg-white/95 px-2 py-1 rounded text-sm font-semibold text-[#654177]">
                  {earlyBird && event.earlyBirdPrice
                    ? formatPrice(event.earlyBirdPrice, 'COP')
                    : formatPrice(event.price, 'COP')}
                </div>
              )}

              {/* Contenido sobre imagen */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                {/* Fecha */}
                <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(event.eventDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Título */}
                <h3 className="font-gazeta text-lg line-clamp-2 group-hover:text-[#e8d4f0] transition-colors">
                  {event.title}
                </h3>

                {/* Ubicación */}
                <div className="flex items-center gap-2 text-sm text-white/80 mt-2">
                  {event.locationType === 'online' ? (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Zoom</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>{event.venue?.city || 'Presencial'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}

      {/* Sin eventos */}
      {events.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">No se encontraron eventos</p>
        </div>
      )}
    </div>
  )
}
