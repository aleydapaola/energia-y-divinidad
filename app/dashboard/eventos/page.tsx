import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Video, ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mis Eventos | Energía y Divinidad',
  description: 'Gestiona tus reservas de eventos',
}

async function getUserBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      bookingType: 'EVENT',
    },
    orderBy: {
      scheduledAt: 'desc',
    },
  })

  // Enriquecer con datos de Sanity
  const enrichedBookings = await Promise.all(
    bookings.map(async (booking) => {
      const event = await getEventById(booking.resourceId)
      return {
        ...booking,
        event,
      }
    })
  )

  return enrichedBookings
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: string, paymentStatus: string | null) {
  if (status === 'CONFIRMED' || paymentStatus === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
        <CheckCircle className="w-3 h-3" />
        Confirmado
      </span>
    )
  }
  if (status === 'PENDING_PAYMENT' || paymentStatus === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
        <Clock className="w-3 h-3" />
        Pendiente de pago
      </span>
    )
  }
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
        <AlertCircle className="w-3 h-3" />
        Cancelado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
      {status}
    </span>
  )
}

export default async function DashboardEventosPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/dashboard/eventos')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const bookings = await getUserBookings(user.id)

  // Separar en próximos y pasados
  const now = new Date()
  const upcomingBookings = bookings.filter(
    (b) => b.scheduledAt && new Date(b.scheduledAt) > now && b.status !== 'CANCELLED'
  )
  const pastBookings = bookings.filter(
    (b) => b.scheduledAt && new Date(b.scheduledAt) <= now || b.status === 'CANCELLED'
  )

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="font-gazeta text-4xl text-[#654177] mb-8">Mis Eventos</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-[#f8f0f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#8A4BAF]" />
            </div>
            <h2 className="font-gazeta text-2xl text-[#654177] mb-2">
              No tienes reservas de eventos
            </h2>
            <p className="text-gray-600 mb-6">
              Explora nuestros próximos eventos y únete a la comunidad.
            </p>
            <Link
              href="/eventos"
              className="inline-block px-6 py-3 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors"
            >
              Ver Eventos
            </Link>
          </div>
        ) : (
          <>
            {/* Próximos eventos */}
            {upcomingBookings.length > 0 && (
              <section className="mb-12">
                <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">
                  Próximos Eventos ({upcomingBookings.length})
                </h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        {booking.event?.mainImage && (
                          <div className="relative w-full md:w-48 h-32 md:h-auto flex-shrink-0">
                            <Image
                              src={booking.event.mainImage.asset.url}
                              alt={booking.event.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-6 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {getStatusBadge(booking.status, booking.paymentStatus)}
                            {booking.event?.locationType === 'online' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                <Video className="w-3 h-3" />
                                Online
                              </span>
                            )}
                          </div>

                          <h3 className="font-gazeta text-xl text-[#654177] mb-2">
                            {booking.event?.title || booking.resourceName}
                          </h3>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <Calendar className="w-4 h-4 text-[#8A4BAF]" />
                            <span>{booking.scheduledAt && formatDate(booking.scheduledAt)}</span>
                          </div>

                          {booking.event?.locationType === 'in_person' && booking.event.venue && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                              <MapPin className="w-4 h-4 text-[#8A4BAF]" />
                              <span>
                                {booking.event.venue.name || booking.event.venue.city}
                              </span>
                            </div>
                          )}

                          {/* Zoom link for confirmed online events */}
                          {booking.status === 'CONFIRMED' &&
                            booking.event?.locationType === 'online' &&
                            booking.event?.zoom?.meetingUrl && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800 font-medium mb-2">
                                  Acceso a Zoom
                                </p>
                                <a
                                  href={booking.event.zoom.meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Unirse a la reunión
                                </a>
                                {booking.event.zoom.meetingId && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    ID: {booking.event.zoom.meetingId}
                                  </p>
                                )}
                                {booking.event.zoom.password && (
                                  <p className="text-xs text-blue-600">
                                    Contraseña: {booking.event.zoom.password}
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Pending payment notice */}
                          {booking.status === 'PENDING_PAYMENT' && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                              <p className="text-sm text-amber-800">
                                Tu reserva está pendiente de confirmación de pago.
                                Una vez verifiquemos el pago, recibirás un email de confirmación.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Eventos pasados */}
            {pastBookings.length > 0 && (
              <section>
                <h2 className="font-gazeta text-2xl text-gray-500 mb-6">
                  Eventos Pasados ({pastBookings.length})
                </h2>
                <div className="space-y-4">
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden opacity-75"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        {booking.event?.mainImage && (
                          <div className="relative w-full md:w-48 h-32 md:h-auto flex-shrink-0">
                            <Image
                              src={booking.event.mainImage.asset.url}
                              alt={booking.event.title}
                              fill
                              className="object-cover grayscale"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-6 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {booking.status === 'CANCELLED' ? (
                              getStatusBadge('CANCELLED', null)
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                Finalizado
                              </span>
                            )}
                          </div>

                          <h3 className="font-gazeta text-xl text-gray-600 mb-2">
                            {booking.event?.title || booking.resourceName}
                          </h3>

                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span>{booking.scheduledAt && formatDate(booking.scheduledAt)}</span>
                          </div>

                          {/* Recording link */}
                          {booking.event?.recording?.url && (
                            <div className="mt-4">
                              <a
                                href={booking.event.recording.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors text-sm"
                              >
                                <Video className="w-4 h-4" />
                                Ver Grabación
                              </a>
                              {booking.event.recording.availableUntil && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Disponible hasta:{' '}
                                  {new Date(booking.event.recording.availableUntil).toLocaleDateString('es-CO')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/eventos"
            className="inline-block px-6 py-3 border border-[#4944a4] text-[#4944a4] rounded-lg hover:bg-[#4944a4] hover:text-white transition-colors"
          >
            Ver todos los eventos
          </Link>
        </div>
      </div>
    </div>
  )
}
