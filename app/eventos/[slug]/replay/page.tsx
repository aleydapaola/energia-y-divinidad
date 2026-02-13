import { ArrowLeft, Calendar, Clock, AlertTriangle, Play } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ReplayVideoPlayer } from '@/components/eventos/ReplayVideoPlayer'
import { auth } from '@/lib/auth'
import { canAccessReplay } from '@/lib/events/replay-access'
import { getEventBySlug, formatEventDate } from '@/lib/sanity/queries/events'

interface ReplayPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ReplayPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return { title: 'Grabacion no encontrada' }
  }

  return {
    title: `Grabacion: ${event.title} | Energia y Divinidad`,
    robots: 'noindex, nofollow',
  }
}

export default async function EventReplayPage({ params }: ReplayPageProps) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/eventos/${slug}/replay`)
  }

  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  const accessResult = await canAccessReplay(session.user.id, event._id)

  // Handle access denied cases
  if (!accessResult.canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-gazeta text-2xl text-[#654177] mb-4">
            {accessResult.reason === 'no_booking' && 'No tienes acceso'}
            {accessResult.reason === 'expired' && 'Acceso expirado'}
            {accessResult.reason === 'no_recording' && 'Grabacion no disponible'}
            {accessResult.reason === 'event_not_found' && 'Evento no encontrado'}
          </h1>
          <p className="text-gray-600 font-dm-sans mb-6">
            {accessResult.reason === 'no_booking' &&
              'Necesitas haber reservado este evento para ver la grabacion.'}
            {accessResult.reason === 'expired' &&
              `Tu acceso a esta grabacion expiro el ${accessResult.expiresAt?.toLocaleDateString('es-CO')}.`}
            {accessResult.reason === 'no_recording' &&
              'La grabacion de este evento aun no esta disponible.'}
            {accessResult.reason === 'event_not_found' && 'El evento que buscas no existe.'}
          </p>
          <Link
            href={`/eventos/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors font-dm-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al evento
          </Link>
        </div>
      </div>
    )
  }

  // Calculate days remaining
  const daysRemaining = accessResult.expiresAt
    ? Math.max(
        0,
        Math.ceil((accessResult.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/eventos/${slug}`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-dm-sans text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al evento
            </Link>

            {/* Access expiration badge */}
            {daysRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-dm-sans ${
                  daysRemaining <= 3
                    ? 'bg-red-500/20 text-red-300'
                    : daysRemaining <= 7
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-green-500/20 text-green-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                {daysRemaining === 0
                  ? 'Expira hoy'
                  : daysRemaining === 1
                    ? 'Expira manana'
                    : `${daysRemaining} dias restantes`}
              </div>
            )}
            {daysRemaining === null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-dm-sans bg-purple-500/20 text-purple-300">
                <Clock className="w-4 h-4" />
                Acceso permanente
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Video Player */}
      <main className="container mx-auto px-4 py-6">
        <ReplayVideoPlayer
          videoUrl={accessResult.url!}
          eventId={event._id}
          bookingId={accessResult.bookingId!}
          initialPosition={accessResult.lastPosition ?? 0}
          eventTitle={event.title}
        />

        {/* Event Info */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6">
          <h1 className="font-gazeta text-2xl lg:text-3xl text-white mb-4">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-400 font-dm-sans text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Evento realizado el {formatEventDate(event.eventDate, false)}</span>
            </div>
            {accessResult.viewCount !== undefined && accessResult.viewCount > 0 && (
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>
                  {accessResult.viewCount === 1
                    ? '1 visualizacion'
                    : `${accessResult.viewCount} visualizaciones`}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
