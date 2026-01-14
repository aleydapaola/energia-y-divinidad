import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, MapPin, Video, Phone, ArrowLeft, Calendar as CalendarIcon, CheckCircle } from 'lucide-react'
import { PortableText } from '@portabletext/react'
import { getSessionBySlug } from '@/lib/sanity/queries/sessions'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  getSessionTypeLabel,
  getDeliveryMethodLabel,
  formatDuration,
  getMemberPrice,
} from '@/lib/sanity/queries/sessions'
import { getBookingSettings } from '@/lib/sanity/queries/bookingSettings'
import { SessionBookingSection } from '@/components/sesiones/SessionBookingSection'

interface SessionPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const { slug } = await params
  const session = await getSessionBySlug(slug)

  if (!session) {
    return {
      title: 'Sesión no encontrada | Energía y Divinidad',
    }
  }

  const metaTitle = session.seo?.metaTitle || `${session.title} | Energía y Divinidad`
  const metaDescription =
    session.seo?.metaDescription ||
    `${getSessionTypeLabel(session.sessionType)} - ${formatDuration(session.duration)}`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
      ...(session.mainImage?.asset?.url && {
        images: [
          {
            url: session.mainImage.asset.url,
            alt: session.mainImage.alt || session.title,
          },
        ],
      }),
    },
  }
}

export default async function SessionDetailPage({ params }: SessionPageProps) {
  const { slug } = await params
  const [session, bookingSettings] = await Promise.all([
    getSessionBySlug(slug),
    getBookingSettings(),
  ])

  if (!session) {
    notFound()
  }

  const hasDiscount = (session.memberDiscount || 0) > 0

  return (
    <>
      <Header session={null} />
      <div className="min-h-screen bg-background">
        {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/sesiones"
          className="inline-flex items-center gap-2 text-brand hover:text-brand/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Sesiones</span>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
              {session.mainImage?.asset?.url ? (
                <Image
                  src={session.mainImage.asset.url}
                  alt={session.mainImage.alt || session.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-9xl">🔮</span>
                </div>
              )}
              {session.featured && (
                <div className="absolute top-4 right-4 bg-brand text-white px-4 py-2 rounded-full text-sm font-semibold">
                  ⭐ Destacado
                </div>
              )}
            </div>

            {/* Session Info */}
            <div>
              {/* Session Type Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand text-sm font-medium rounded-full">
                  {getSessionTypeLabel(session.sessionType)}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-gazeta text-4xl sm:text-5xl text-[#654177] mb-6">
                {session.title}
              </h1>

              {/* Key Details */}
              <div className="space-y-4 mb-8">
                {/* Duration */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-primary font-medium">
                      {formatDuration(session.duration)}
                    </p>
                    <p className="text-primary/60 text-sm">Duración de la sesión</p>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="flex items-start gap-3">
                  {session.deliveryMethod === 'video_call' && <Video className="w-5 h-5 text-brand flex-shrink-0 mt-1" />}
                  {session.deliveryMethod === 'phone_call' && <Phone className="w-5 h-5 text-brand flex-shrink-0 mt-1" />}
                  {session.deliveryMethod === 'in_person' && <MapPin className="w-5 h-5 text-brand flex-shrink-0 mt-1" />}
                  {session.deliveryMethod === 'hybrid' && <CalendarIcon className="w-5 h-5 text-brand flex-shrink-0 mt-1" />}
                  <div>
                    <p className="text-primary font-medium">
                      {getDeliveryMethodLabel(session.deliveryMethod)}
                    </p>
                    {session.deliveryMethod === 'video_call' && (
                      <p className="text-primary/60 text-sm">
                        Recibirás el enlace por email
                      </p>
                    )}
                    {session.deliveryMethod === 'hybrid' && (
                      <p className="text-primary/60 text-sm">
                        Tú eliges si prefieres online o presencial
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-brand/5 rounded-lg p-6 mb-8">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-brand">
                    ${session.price.toLocaleString('es-CO')} COP
                  </span>
                </div>
                {session.priceUSD && (
                  <p className="text-primary/60 mb-2">
                    USD ${session.priceUSD} (pagos internacionales)
                  </p>
                )}
                {hasDiscount && (
                  <p className="text-brand font-medium">
                    {session.memberDiscount}% de descuento para miembros activos
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-12 border-t border-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-gazeta text-3xl text-[#8A4BAF] mb-6">
              Sobre esta sesión
            </h2>
            <div className="prose prose-lg max-w-none text-primary/80 leading-relaxed">
              <PortableText value={session.description} />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {session.benefits && session.benefits.length > 0 && (
        <section className="py-12 bg-brand/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl text-[#8A4BAF] mb-6">
                Beneficios
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                    <span className="text-primary/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What to Expect */}
      {session.whatToExpect && session.whatToExpect.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl text-[#8A4BAF] mb-6">
                Qué esperar
              </h2>
              <div className="prose prose-lg max-w-none text-primary/80 leading-relaxed">
                <PortableText value={session.whatToExpect} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Preparation Instructions */}
      {session.preparationInstructions && session.preparationInstructions.length > 0 && (
        <section className="py-12 bg-brand/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl text-[#8A4BAF] mb-6">
                Preparación recomendada
              </h2>
              <div className="prose prose-lg max-w-none text-primary/80 leading-relaxed">
                <PortableText value={session.preparationInstructions} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-8 text-center">
              Reserva tu Sesión
            </h2>
            <SessionBookingSection
              session={session}
              holidays={bookingSettings?.holidays || []}
              blockedDates={bookingSettings?.blockedDates || []}
              timezones={bookingSettings?.availableTimezones || []}
              timezoneNote={bookingSettings?.timezoneNote}
              weeklySchedule={bookingSettings?.weeklySchedule}
            />
          </div>
        </div>
      </section>
      </div>
      <Footer />
    </>
  )
}
