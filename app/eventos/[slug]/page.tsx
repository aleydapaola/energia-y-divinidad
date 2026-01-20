import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Users, Video, ArrowLeft, Clock, CheckCircle } from 'lucide-react'
import { PortableText } from '@portabletext/react'
import { getEventBySlug } from '@/lib/sanity/queries/events'
import {
  formatEventDate,
  getEventTypeLabel,
  getLocationTypeLabel,
  hasAvailableSpots,
  isEarlyBirdActive,
  getCurrentPrice,
  formatPrice,
  canBookEvent,
  getTimeUntilEvent,
} from '@/lib/sanity/queries/events'
import { features } from '@/lib/config/features'
import WaitlistButton from '@/components/eventos/WaitlistButton'
import { EventPerksSection } from '@/components/eventos/EventPerksSection'
import type { EventPerk } from '@/types/events'

interface EventPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return {
      title: 'Evento no encontrado | Energía y Divinidad',
    }
  }

  const metaTitle = event.seo?.metaTitle || `${event.title} | Energía y Divinidad`
  const metaDescription =
    event.seo?.metaDescription ||
    `${getEventTypeLabel(event.eventType)} - ${formatEventDate(event.eventDate)}`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
      ...(event.mainImage?.asset?.url && {
        images: [
          {
            url: event.mainImage.asset.url,
            alt: event.mainImage.alt || event.title,
          },
        ],
      }),
    },
  }
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params

  // Check feature flag
  if (!features.events) {
    notFound()
  }

  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  const available = hasAvailableSpots(event)
  const isSoldOut = event.status === 'sold_out' || !available
  const isPast = event.status === 'completed'
  const isCancelled = event.status === 'cancelled'
  const canBook = canBookEvent(event)
  const earlyBird = isEarlyBirdActive(event)
  const timeUntil = getTimeUntilEvent(event)

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/eventos"
          className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Eventos</span>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
              {event.mainImage?.asset?.url ? (
                <Image
                  src={event.mainImage.asset.url}
                  alt={event.mainImage.alt || event.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-9xl">📅</span>
                </div>
              )}
              {isCancelled && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-6 py-3 rounded-lg text-xl font-semibold">
                    Evento Cancelado
                  </span>
                </div>
              )}
              {isSoldOut && !isCancelled && (
                <div className="absolute top-4 right-4 bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Cupos Agotados
                </div>
              )}
              {event.includedInMembership && !isCancelled && !isSoldOut && (
                <div className="absolute top-4 right-4 bg-[#8A4BAF] text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Incluido en Membresía
                </div>
              )}
              {earlyBird && !isCancelled && !isSoldOut && (
                <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Early Bird
                </div>
              )}
            </div>

            {/* Event Info */}
            <div>
              {/* Event Type Badge */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#8A4BAF]/10 text-[#8A4BAF] text-sm font-medium rounded-full">
                  {event.locationType === 'online' ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  {getEventTypeLabel(event.eventType)}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#eef1fa] text-[#4944a4] text-sm font-medium rounded-full">
                  <Clock className="w-4 h-4" />
                  {timeUntil}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-gazeta text-4xl sm:text-5xl text-[#654177] mb-6">
                {event.title}
              </h1>

              {/* Key Details */}
              <div className="space-y-4 mb-8">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-800 font-medium">
                      {formatEventDate(event.eventDate, true)}
                    </p>
                    {event.endDate && (
                      <p className="text-gray-500 text-sm">
                        Hasta: {formatEventDate(event.endDate, true)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  {event.locationType === 'online' ? (
                    <>
                      <Video className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-gray-800 font-medium">Evento Online (Zoom)</p>
                        <p className="text-gray-500 text-sm">
                          Recibirás el link de acceso después de inscribirte
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-gray-800 font-medium">
                          {event.venue?.name || event.venue?.city || 'Evento Presencial'}
                        </p>
                        {event.venue?.address && (
                          <p className="text-gray-500 text-sm">{event.venue.address}</p>
                        )}
                        {event.venue?.city && event.venue?.country && (
                          <p className="text-gray-500 text-sm">
                            {event.venue.city}, {event.venue.country}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Capacity */}
                {event.capacity && event.capacity > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-[#8A4BAF] flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-800 font-medium">
                        {typeof event.availableSpots === 'number' && event.availableSpots >= 0
                          ? `${event.availableSpots} cupos disponibles`
                          : `${event.capacity} cupos disponibles`}
                      </p>
                      {typeof event.availableSpots === 'number' && event.availableSpots >= 0 && (
                        <p className="text-gray-500 text-sm">
                          de {event.capacity} cupos totales
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="bg-[#f8f0f5] rounded-xl p-6 mb-8">
                {event.includedInMembership ? (
                  <div>
                    <p className="text-[#8A4BAF] font-semibold text-lg mb-2">
                      Gratis para miembros
                    </p>
                    <p className="text-gray-600 text-sm">
                      Este evento está incluido en tu membresía activa
                    </p>
                    {event.price && (
                      <p className="text-gray-500 text-sm mt-2">
                        Precio sin membresía: {formatPrice(event.price, 'COP')}
                      </p>
                    )}
                  </div>
                ) : event.price ? (
                  <div>
                    {earlyBird && event.earlyBirdPrice ? (
                      <>
                        <p className="text-3xl font-bold text-[#8A4BAF] mb-1">
                          {formatPrice(event.earlyBirdPrice, 'COP')}
                        </p>
                        <p className="text-gray-500 text-sm line-through">
                          Precio regular: {formatPrice(event.price, 'COP')}
                        </p>
                        <p className="text-green-600 text-sm mt-1">
                          Early Bird hasta {new Date(event.earlyBirdDeadline!).toLocaleDateString('es-CO')}
                        </p>
                      </>
                    ) : (
                      <p className="text-3xl font-bold text-[#8A4BAF] mb-2">
                        {formatPrice(event.price, 'COP')}
                      </p>
                    )}
                    {event.priceUSD && (
                      <p className="text-gray-500 text-sm">
                        {formatPrice(event.priceUSD, 'USD')} (pagos internacionales)
                      </p>
                    )}
                    {event.memberDiscount && (
                      <p className="text-[#8A4BAF] text-sm mt-2">
                        {event.memberDiscount}% de descuento para miembros
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Precio por confirmar</p>
                )}
              </div>

              {/* CTA Button */}
              {!isCancelled && !isPast && (
                <>
                  {canBook ? (
                    <Link
                      href={`/eventos/${event.slug.current}/checkout`}
                      className="block w-full py-4 rounded-xl text-lg font-medium text-center transition-colors bg-[#4944a4] text-white hover:bg-[#3d3a8a]"
                    >
                      Reservar mi Cupo
                    </Link>
                  ) : isSoldOut ? (
                    <WaitlistButton
                      eventId={event._id}
                      eventTitle={event.title}
                      maxSeats={event.maxPerBooking || 1}
                    />
                  ) : (
                    <div className="bg-gray-300 text-gray-600 py-4 rounded-xl text-center text-lg font-medium cursor-not-allowed">
                      No disponible
                    </div>
                  )}
                </>
              )}

              {isPast && (
                <div className="bg-gray-100 text-gray-600 py-4 rounded-xl text-center text-lg font-medium">
                  Evento Finalizado
                </div>
              )}

              {/* Recording available */}
              {isPast && event.recording?.url && (
                <a
                  href={event.recording.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block w-full py-4 bg-[#4944a4] text-white rounded-xl text-lg font-medium text-center hover:bg-[#3d3a8a] transition-colors"
                >
                  Ver Grabación
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-12 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-gazeta text-3xl text-[#8A4BAF] mb-6">
              Sobre este evento
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <PortableText value={event.description} />
            </div>
          </div>
        </div>
      </section>

      {/* Event Perks */}
      {event.perks && event.perks.length > 0 && (
        <EventPerksSection perks={event.perks as EventPerk[]} />
      )}

      {/* What's Included / What to Bring */}
      {(event.includes?.length || event.whatToBring?.length) && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {(event.includes?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-4">
                    ¿Qué incluye?
                  </h3>
                  <ul className="space-y-2">
                    {event.includes!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(event.whatToBring?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-4">
                    ¿Qué traer?
                  </h3>
                  <ul className="space-y-2">
                    {event.whatToBring!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#8A4BAF]">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Requirements */}
      {event.requirements && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6">
                <h3 className="font-gazeta text-xl text-amber-800 mb-3">
                  Requisitos Previos
                </h3>
                <p className="text-amber-700">{event.requirements}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Membership Required (solo miembros pueden comprar) */}
      {event.memberOnlyPurchase && (
        <section className="py-12 bg-[#eef1fa]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl p-6 border-l-4 border-[#8A4BAF]">
                <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3">
                  Evento exclusivo para miembros
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Este evento está disponible únicamente para miembros activos de nuestra comunidad.
                  Si aún no eres miembro, puedes unirte para acceder a este y otros eventos exclusivos.
                </p>
                <Link
                  href="/membresia"
                  className="inline-flex items-center gap-2 text-[#4944a4] hover:text-[#3d3a8a] font-medium"
                >
                  Ver Planes de Membresía
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {(event.categories?.length ?? 0) > 0 && (
        <section className="py-8 border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {event.categories!.map((category) => (
                <span
                  key={category}
                  className="px-3 py-1 bg-[#f8f0f5] text-[#8A4BAF] text-sm rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
