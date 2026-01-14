'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Video, Users, Minus, Plus, Loader2, Check } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Event {
  _id: string
  title: string
  slug: { current: string }
  eventType: string
  mainImage: { asset: { url: string }; alt?: string }
  eventDate: string
  endDate?: string
  locationType: 'online' | 'in_person'
  venue?: { name?: string; city?: string; address?: string }
  price?: number
  priceUSD?: number
  earlyBirdPrice?: number
  earlyBirdDeadline?: string
  capacity?: number
  maxPerBooking: number
  availableSpots?: number
  includedInMembership: boolean
  memberDiscount?: number
}

interface CheckoutPageProps {
  params: Promise<{ slug: string }>
}

export default function EventCheckoutPage({ params }: CheckoutPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [seats, setSeats] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [country, setCountry] = useState<'colombia' | 'international'>('colombia')
  const [paymentMethod, setPaymentMethod] = useState<'nequi' | 'stripe'>('nequi')
  const [notes, setNotes] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Order result
  const [orderResult, setOrderResult] = useState<any>(null)

  // Cargar evento
  useEffect(() => {
    async function loadEvent() {
      try {
        const resolvedParams = await params
        const response = await fetch(`/api/sanity/events/${resolvedParams.slug}`)
        if (!response.ok) throw new Error('Evento no encontrado')
        const data = await response.json()
        setEvent(data)

        // Pre-fill user data if logged in
        if (session?.user) {
          setCustomerName(session.user.name || '')
          setCustomerEmail(session.user.email || '')
        }
      } catch (err) {
        setError('No se pudo cargar el evento')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [params, session])

  // Calcular precio
  const isEarlyBird = event?.earlyBirdPrice && event?.earlyBirdDeadline &&
    new Date() <= new Date(event.earlyBirdDeadline)

  const getUnitPrice = () => {
    if (!event) return 0
    if (country === 'international') return event.priceUSD || 0
    return isEarlyBird ? event.earlyBirdPrice! : (event.price || 0)
  }

  const getCurrency = () => country === 'colombia' ? 'COP' : 'USD'
  const unitPrice = getUnitPrice()
  const totalPrice = unitPrice * seats

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `USD $${amount.toLocaleString('en-US')}`
    }
    return `$${amount.toLocaleString('es-CO')} COP`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !acceptTerms) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/events/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event._id,
          seats,
          customerName,
          customerEmail,
          customerPhone,
          country,
          paymentMethod,
          notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la reserva')
      }

      setOrderResult(data)
      setSuccess(true)

      // Si es pago con Stripe, redirigir a checkout de Stripe
      if (paymentMethod === 'stripe' && !data.isFreeForMember) {
        // TODO: Implementar redirección a Stripe Checkout
        // router.push(`/checkout/stripe?orderId=${data.orderId}`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la reserva')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/eventos" className="text-[#4944a4] hover:underline">
          Volver a eventos
        </Link>
      </div>
    )
  }

  if (success && orderResult) {
    return (
      <div className="min-h-screen bg-[#f8f0f5] py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>

            <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
              {orderResult.isFreeForMember ? '¡Reserva Confirmada!' : '¡Reserva Recibida!'}
            </h1>

            <p className="text-gray-600 mb-6">
              {orderResult.isFreeForMember
                ? 'Tu cupo está confirmado. Te hemos enviado los detalles por email.'
                : paymentMethod === 'nequi'
                  ? 'Hemos recibido tu solicitud. Completa el pago por Nequi para confirmar tu cupo.'
                  : 'Serás redirigido a la pasarela de pago.'}
            </p>

            <div className="bg-[#f8f0f5] rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-[#654177] mb-3">Detalles de tu reserva</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Evento:</span> {orderResult.eventTitle}</p>
                <p><span className="text-gray-500">Fecha:</span> {formatDate(orderResult.eventDate)}</p>
                <p><span className="text-gray-500">Cupos:</span> {orderResult.seats}</p>
                <p><span className="text-gray-500">Total:</span> {formatPrice(orderResult.amount, orderResult.currency)}</p>
                <p><span className="text-gray-500">N° de orden:</span> {orderResult.orderNumber}</p>
              </div>
            </div>

            {paymentMethod === 'nequi' && !orderResult.isFreeForMember && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-purple-800 mb-3">Instrucciones de Pago - Nequi</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-purple-700">
                  <li>Abre tu app de Nequi</li>
                  <li>Selecciona "Enviar dinero"</li>
                  <li>Envía <strong>{formatPrice(orderResult.amount, 'COP')}</strong> al número <strong>XXX XXX XXXX</strong></li>
                  <li>En la descripción escribe: <strong>{orderResult.orderNumber}</strong></li>
                  <li>Guarda el comprobante</li>
                </ol>
                <p className="mt-4 text-xs text-purple-600">
                  Tu reserva será confirmada una vez verifiquemos el pago (máximo 24 horas hábiles).
                </p>
              </div>
            )}

            {orderResult.zoomUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-blue-800 mb-3">Información de Zoom</h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><span className="font-medium">Link:</span> <a href={orderResult.zoomUrl} target="_blank" rel="noopener noreferrer" className="underline">{orderResult.zoomUrl}</a></p>
                  {orderResult.zoomId && <p><span className="font-medium">ID:</span> {orderResult.zoomId}</p>}
                  {orderResult.zoomPassword && <p><span className="font-medium">Contraseña:</span> {orderResult.zoomPassword}</p>}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/eventos"
                className="px-6 py-3 border border-[#4944a4] text-[#4944a4] rounded-lg hover:bg-[#4944a4] hover:text-white transition-colors"
              >
                Ver más eventos
              </Link>
              {session && (
                <Link
                  href="/dashboard/eventos"
                  className="px-6 py-3 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors"
                >
                  Mis reservas
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) return null

  const maxSeats = Math.min(
    event.maxPerBooking || 1,
    event.availableSpots ?? event.maxPerBooking ?? 1
  )

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back button */}
        <Link
          href={`/eventos/${event.slug.current}`}
          className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al evento
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Summary */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
              {event.mainImage?.asset?.url ? (
                <Image
                  src={event.mainImage.asset.url}
                  alt={event.mainImage.alt || event.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-8xl">📅</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h1 className="font-gazeta text-2xl text-[#654177] mb-4">{event.title}</h1>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#8A4BAF]" />
                  <span>{formatDate(event.eventDate)}</span>
                </div>

                <div className="flex items-center gap-3">
                  {event.locationType === 'online' ? (
                    <>
                      <Video className="w-5 h-5 text-[#8A4BAF]" />
                      <span>Evento Online (Zoom)</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-[#8A4BAF]" />
                      <span>{event.venue?.name || event.venue?.city || 'Presencial'}</span>
                    </>
                  )}
                </div>

                {event.availableSpots !== undefined && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#8A4BAF]" />
                    <span>{event.availableSpots} cupos disponibles</span>
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Precio por persona</span>
                  <span className="font-semibold">
                    {formatPrice(unitPrice, getCurrency())}
                    {isEarlyBird && (
                      <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        Early Bird
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Cantidad</span>
                  <span>{seats} cupo{seats > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-[#654177]">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice, getCurrency())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-gazeta text-xl text-[#654177] mb-6">Completa tu reserva</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seats selector */}
              {maxSeats > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de cupos
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setSeats(Math.max(1, seats - 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      disabled={seats <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-semibold w-8 text-center">{seats}</span>
                    <button
                      type="button"
                      onClick={() => setSeats(Math.min(maxSeats, seats + 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      disabled={seats >= maxSeats}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                  placeholder="+57 300 123 4567"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="country"
                      value="colombia"
                      checked={country === 'colombia'}
                      onChange={() => {
                        setCountry('colombia')
                        setPaymentMethod('nequi')
                      }}
                      className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                    />
                    <span>Colombia</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="country"
                      value="international"
                      checked={country === 'international'}
                      onChange={() => {
                        setCountry('international')
                        setPaymentMethod('stripe')
                      }}
                      className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                    />
                    <span>Internacional</span>
                  </label>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de pago
                </label>
                <div className="space-y-3">
                  {country === 'colombia' && (
                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#8A4BAF] transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="nequi"
                        checked={paymentMethod === 'nequi'}
                        onChange={() => setPaymentMethod('nequi')}
                        className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                      />
                      <div>
                        <span className="font-medium">Nequi</span>
                        <p className="text-xs text-gray-500">Transferencia desde tu app Nequi</p>
                      </div>
                    </label>
                  )}
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#8A4BAF] transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={paymentMethod === 'stripe'}
                      onChange={() => setPaymentMethod('stripe')}
                      className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                    />
                    <div>
                      <span className="font-medium">Tarjeta de crédito/débito</span>
                      <p className="text-xs text-gray-500">Pago seguro con Stripe</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                  placeholder="¿Algo que debamos saber?"
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  className="mt-1 text-[#8A4BAF] focus:ring-[#8A4BAF] rounded"
                />
                <span className="text-sm text-gray-600">
                  Acepto los{' '}
                  <Link href="/terminos" className="text-[#8A4BAF] hover:underline">
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacidad" className="text-[#8A4BAF] hover:underline">
                    política de privacidad
                  </Link>
                </span>
              </label>

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting || !acceptTerms}
                className="w-full py-4 bg-[#4944a4] text-white rounded-lg font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Confirmar reserva - {formatPrice(totalPrice, getCurrency())}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
