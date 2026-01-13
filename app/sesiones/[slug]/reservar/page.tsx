import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react'
import { getSessionBySlug } from '@/lib/sanity/queries/sessions'
import {
  getSessionTypeLabel,
  formatDuration,
} from '@/lib/sanity/queries/sessions'
import { CheckoutForm } from '@/components/sesiones/CheckoutForm'

interface ReservarPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ date?: string; time?: string }>
}

export const metadata: Metadata = {
  title: 'Reservar Sesión | Energía y Divinidad',
  description: 'Completa tu reserva de sesión individual',
}

export default async function ReservarPage({ params, searchParams }: ReservarPageProps) {
  const { slug } = await params
  const { date, time } = await searchParams

  // Validate required parameters
  if (!date || !time) {
    redirect(`/sesiones/${slug}`)
  }

  // Get session from Sanity
  const session = await getSessionBySlug(slug)

  if (!session || session.status !== 'active') {
    notFound()
  }

  // Parse date
  const selectedDate = new Date(date)
  if (isNaN(selectedDate.getTime())) {
    redirect(`/sesiones/${slug}`)
  }

  // Format date for display
  const formattedDate = selectedDate.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Combine date and time for full datetime
  const [hours, minutes] = time.split(':').map(Number)
  const scheduledDateTime = new Date(selectedDate)
  scheduledDateTime.setHours(hours, minutes, 0, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href={`/sesiones/${slug}`}
          className="inline-flex items-center gap-2 text-brand hover:text-brand/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Sesión</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl text-brand mb-4">
              Completa tu Reserva
            </h1>
            <p className="text-primary/70 text-lg">
              Estás a un paso de reservar tu sesión
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Session Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="font-serif text-xl text-brand mb-4">
                  Resumen de tu Reserva
                </h2>

                {/* Session Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                  <Image
                    src={session.mainImage.asset.url}
                    alt={session.mainImage.alt || session.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Session Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-primary/60 uppercase tracking-wide mb-1">
                      Sesión
                    </p>
                    <p className="font-medium text-primary">{session.title}</p>
                    <p className="text-sm text-primary/70">
                      {getSessionTypeLabel(session.sessionType)}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-primary/60 uppercase tracking-wide mb-1">
                        Fecha
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-primary/60 uppercase tracking-wide mb-1">
                        Hora
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {time} (Hora de Colombia GMT-5)
                      </p>
                      <p className="text-xs text-primary/60">
                        Duración: {formatDuration(session.duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-primary/60 uppercase tracking-wide mb-1">
                        Modalidad
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {session.deliveryMethod === 'video_call' && 'Videollamada Online'}
                        {session.deliveryMethod === 'phone_call' && 'Llamada Telefónica'}
                        {session.deliveryMethod === 'in_person' && 'Presencial'}
                        {session.deliveryMethod === 'hybrid' && 'Híbrido'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm text-primary/70">Precio (COP)</span>
                      <span className="font-bold text-xl text-brand">
                        ${session.price.toLocaleString('es-CO')}
                      </span>
                    </div>
                    {session.priceUSD && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-primary/70">Precio (USD)</span>
                        <span className="font-medium text-lg text-brand">
                          ${session.priceUSD}
                        </span>
                      </div>
                    )}
                    {session.memberDiscount && session.memberDiscount > 0 && (
                      <p className="text-xs text-brand mt-2">
                        {session.memberDiscount}% descuento disponible para miembros
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Checkout Form */}
            <div className="lg:col-span-2">
              <CheckoutForm
                session={session}
                scheduledDateTime={scheduledDateTime}
                formattedDate={formattedDate}
                formattedTime={time}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
