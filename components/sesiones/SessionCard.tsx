import { Clock, MapPin, Video, Phone, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import {
  getSessionTypeLabel,
  getDeliveryMethodLabel,
  formatDuration,
  getMemberPrice,
} from '@/lib/sanity/queries/sessions'

import type { Session } from '@/lib/sanity/queries/sessions'

interface SessionCardProps {
  session: Session
}

export default function SessionCard({ session }: SessionCardProps) {
  const hasDiscount = (session.memberDiscount || 0) > 0

  return (
    <Link
      href={`/sesiones/${session.slug.current}`}
      className="group block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
        {session.mainImage?.asset?.url ? (
          <Image
            src={session.mainImage.asset.url}
            alt={session.mainImage.alt || session.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🔮</span>
          </div>
        )}
        {session.featured && (
          <span className="absolute top-4 right-4 bg-brand text-white px-3 py-1 rounded-full text-xs font-semibold">
            ⭐ Destacado
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Session Type Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
            {getSessionTypeLabel(session.sessionType)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl text-brand mb-3 group-hover:text-brand/80 transition-colors line-clamp-2">
          {session.title}
        </h3>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-primary/70 mb-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatDuration(session.duration)}</span>
        </div>

        {/* Delivery Method */}
        <div className="flex items-start gap-2 text-sm text-primary/70 mb-4">
          {session.deliveryMethod === 'video_call' && <Video className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {session.deliveryMethod === 'phone_call' && <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {session.deliveryMethod === 'in_person' && <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {session.deliveryMethod === 'hybrid' && <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{getDeliveryMethodLabel(session.deliveryMethod)}</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-4 border-t border-primary/10">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand">
                ${session.price.toLocaleString('es-CO')} COP
              </span>
            </div>
            {session.priceUSD && (
              <p className="text-sm text-primary/60 mt-1">
                USD ${session.priceUSD}
              </p>
            )}
            {hasDiscount && (
              <p className="text-sm text-brand mt-1">
                {session.memberDiscount}% descuento para miembros
              </p>
            )}
          </div>

          <button
            className="px-6 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            Reservar
          </button>
        </div>
      </div>
    </Link>
  )
}
