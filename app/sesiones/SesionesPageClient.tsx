"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Video, Heart, Sparkles, MessageCircle, Ticket, CheckCircle, Loader2 } from 'lucide-react'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { PaymentMethodSelector, type PaymentRegion } from '@/components/pago/PaymentMethodSelector'
import type { PaymentMethodType } from '@/lib/membership-access'
import type { Holiday, BlockedDateRange, Timezone } from '@/lib/sanity/queries/bookingSettings'

interface SessionForCalendar {
  _id: string
  title: string
  slug: { current: string }
  duration: number
  price: number
  priceUSD: number
  maxAdvanceBooking: number
  availabilitySchedule?: {
    monday?: Array<{ start: string; end: string }>
    tuesday?: Array<{ start: string; end: string }>
    wednesday?: Array<{ start: string; end: string }>
    thursday?: Array<{ start: string; end: string }>
    friday?: Array<{ start: string; end: string }>
    saturday?: Array<{ start: string; end: string }>
    sunday?: Array<{ start: string; end: string }>
  }
}

interface SessionDetails {
  duration: number
  deliveryMethod: string
  availableDays: string
  price: number
  priceUSD: number
  priceEUR: number
  formattedPrice: string
}

interface SesionesPageClientProps {
  session: SessionForCalendar
  sessionDetails: SessionDetails
  holidays: Holiday[]
  blockedDates: BlockedDateRange[]
  timezones: Timezone[]
  timezoneNote: string
}

interface ValidatedPack {
  id: string
  code: string
  packName: string
  sessionsTotal: number
  sessionsUsed: number
  sessionsRemaining: number
}

export function SesionesPageClient({
  session,
  sessionDetails,
  holidays,
  blockedDates,
  timezones,
  timezoneNote,
}: SesionesPageClientProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'single' | 'pack'>('single')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Pack code redemption state
  const [showPackCodeModal, setShowPackCodeModal] = useState(false)
  const [packCode, setPackCode] = useState('')
  const [validatedPack, setValidatedPack] = useState<ValidatedPack | null>(null)
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [isRedeemingSession, setIsRedeemingSession] = useState(false)

  // Precios del pack (precio especial con descuento, la 8va sesion es gratis)
  // Tasas aprox: 1 USD ≈ 4,100 COP | 1 EUR ≈ 4,400 COP
  const PRICES = {
    single: { COP: sessionDetails.price, USD: sessionDetails.priceUSD, EUR: sessionDetails.priceEUR },
    pack: { COP: 1850000, USD: 450, EUR: 420 }, // Pack de 8 sesiones: 7+1 gratis
  }

  const handlePaymentClick = (type: 'single' | 'pack') => {
    setPaymentType(type)
    setShowPaymentModal(true)
    setError(null)
  }

  const handlePaymentMethodSelect = async (
    method: PaymentMethodType,
    region: PaymentRegion,
    phoneNumber?: string,
    guestEmail?: string,
    guestName?: string
  ) => {
    setIsProcessing(true)
    setError(null)

    try {
      const currency = region === 'colombia' ? 'COP' : 'USD'

      // Determinar endpoint según método de pago
      let endpoint: string
      let body: any

      // Construir fecha programada completa (fecha + hora)
      let scheduledAt: string | undefined
      if (paymentType === 'single' && selectedDate && selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const scheduledDateTime = new Date(selectedDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        scheduledAt = scheduledDateTime.toISOString()
      }

      // DEBUG: Log en cliente
      console.log('[CLIENT] Payment request:', {
        paymentType,
        selectedDate: selectedDate?.toISOString(),
        selectedTime,
        scheduledAt,
        hasScheduledAt: !!scheduledAt,
      })

      if (method === 'wompi_nequi' || method === 'wompi_card') {
        // Pago via Wompi (Colombia)
        endpoint = '/api/checkout/wompi'
        body = {
          productType: paymentType === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: paymentType === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: region === 'colombia' ? sessionDetails.price : sessionDetails.priceUSD,
          paymentMethod: method === 'wompi_nequi' ? 'nequi' : 'card',
          phoneNumber,
          guestEmail,
          guestName,
          sessionSlug: paymentType === 'single' ? session.slug.current : undefined,
          scheduledAt,
        }
      } else if (method === 'breb_manual') {
        // Pago manual via Bre-B (Colombia) - Transferencia con llave Bancolombia
        endpoint = '/api/checkout/breb'
        body = {
          productType: paymentType === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: paymentType === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: sessionDetails.price, // Bre-B solo COP
          guestEmail,
          guestName,
          scheduledAt,
        }
      } else {
        // Pago via PayPal (Internacional)
        endpoint = '/api/checkout/paypal'
        body = {
          productType: paymentType === 'pack' ? 'pack' : 'session',
          productId: 'session-canalizacion',
          productName: paymentType === 'pack' ? 'Pack de 8 Sesiones' : 'Sesión de Canalización',
          amount: region === 'colombia' ? sessionDetails.price : sessionDetails.priceUSD,
          currency,
          guestEmail,
          guestName,
          sessionSlug: paymentType === 'single' ? session.slug.current : undefined,
          scheduledAt,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago')
      }

      // Redirect según respuesta
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.redirectUrl) {
        router.push(data.redirectUrl)
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago')
      setIsProcessing(false)
    }
  }

  // Validate pack code
  const handleValidatePackCode = async () => {
    if (!packCode.trim()) {
      setError('Por favor ingresa tu codigo de pack')
      return
    }

    setIsValidatingCode(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions/validate-pack-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: packCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Codigo invalido')
      }

      if (data.valid) {
        setValidatedPack(data.packCode)
      } else {
        throw new Error(data.error || 'Codigo invalido')
      }
    } catch (err: any) {
      setError(err.message || 'Error al validar el codigo')
      setValidatedPack(null)
    } finally {
      setIsValidatingCode(false)
    }
  }

  // Redeem session from pack
  const handleRedeemSession = async () => {
    if (!validatedPack || !selectedDate || !selectedTime) {
      setError('Selecciona una fecha y hora para tu sesion')
      return
    }

    setIsRedeemingSession(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions/redeem-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packCodeId: validatedPack.id,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reservar la sesion')
      }

      // Success!
      setSuccessMessage(data.message || 'Sesion reservada exitosamente')
      setShowPackCodeModal(false)
      setValidatedPack(null)
      setPackCode('')
      setSelectedDate(null)
      setSelectedTime(null)

      // Redirect to confirmation or dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard/sesiones')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Error al reservar la sesion')
    } finally {
      setIsRedeemingSession(false)
    }
  }

  // Formatear precio para mostrar
  const formatPriceCOP = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
        {/* Hero Section */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-6">
                Sesiones Individuales
              </h1>
              <p className="font-dm-sans text-[#654177]/80 text-lg leading-relaxed max-w-2xl mx-auto">
                Un espacio sagrado de acompanamiento personalizado donde juntas exploramos
                lo que necesitas en este momento de tu camino. Cada sesion es unica y
                se adapta a ti.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content - Calendar and Info */}
        <section className="pb-16 sm:pb-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-6xl mx-auto">

              {/* Left Column - Session Info */}
              <div className="space-y-6 sm:space-y-8">
                {/* What to Expect */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#8A4BAF]/10">
                  <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">
                    Que puedes esperar?
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">Escucha Profunda</h3>
                        <p className="font-dm-sans text-sm text-gray-600">
                          Un espacio seguro donde ser escuchada sin juicios, con presencia amorosa.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">Sanacion Energetica</h3>
                        <p className="font-dm-sans text-sm text-gray-600">
                          Trabajo con tu campo energetico para liberar bloqueos y restaurar el flujo vital.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">Mensajes Canalizados</h3>
                        <p className="font-dm-sans text-sm text-gray-600">
                          Recibe guia y claridad a traves de mensajes de tus guias espirituales.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Details - DINAMICO DESDE SANITY */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#8A4BAF]/10">
                  <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6 italic">
                    Detalles de la Sesion
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#8A4BAF]" />
                      <span className="font-dm-sans text-gray-700">
                        Duracion: {sessionDetails.duration} minutos
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-[#8A4BAF]" />
                      <span className="font-dm-sans text-gray-700">
                        Modalidad: {sessionDetails.deliveryMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#8A4BAF]" />
                      <span className="font-dm-sans text-gray-700">
                        {sessionDetails.availableDays}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-gazeta text-3xl text-[#8A4BAF]">
                        ${sessionDetails.formattedPrice} COP
                      </span>
                    </div>
                    <p className="font-dm-sans text-sm text-gray-500">
                      ~${sessionDetails.priceUSD} USD | ~{sessionDetails.priceEUR} EUR
                    </p>
                  </div>
                </div>

                {/* Pack de 8 Sesiones */}
                <div className="bg-gradient-to-br from-[#8A4BAF] to-[#654177] rounded-2xl p-6 md:p-8 shadow-lg text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-dm-sans font-medium">
                      7 + 1 GRATIS
                    </span>
                  </div>
                  <h2 className="font-gazeta text-2xl mb-3">
                    Pack de 8 Sesiones
                  </h2>
                  <p className="font-dm-sans text-white/80 text-sm mb-4">
                    Para quienes desean un proceso de acompanamiento mas profundo y sostenido. Pagas 7 sesiones y recibes 8.
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-gazeta text-3xl">
                      ${formatPriceCOP(PRICES.pack.COP)} COP
                    </span>
                  </div>
                  <p className="font-dm-sans text-xs text-white/60 mb-6">
                    ~${PRICES.pack.USD} USD | ~{PRICES.pack.EUR} EUR | Válido por 1 año
                  </p>
                  <button
                    onClick={() => handlePaymentClick('pack')}
                    className="w-full bg-white text-[#8A4BAF] py-3 rounded-lg font-dm-sans font-semibold hover:bg-white/90 transition-colors"
                  >
                    Comprar Pack
                  </button>
                </div>

                {/* Redeem Pack Code Card */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border-2 border-dashed border-[#8A4BAF]/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-[#8A4BAF]" />
                    </div>
                    <h3 className="font-gazeta text-xl text-[#8A4BAF]">
                      Tienes un codigo de pack?
                    </h3>
                  </div>
                  <p className="font-dm-sans text-sm text-gray-600 mb-4">
                    Si ya compraste un pack de sesiones, ingresa tu codigo para reservar.
                  </p>
                  <button
                    onClick={() => setShowPackCodeModal(true)}
                    className="w-full border-2 border-[#8A4BAF] text-[#8A4BAF] py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#8A4BAF]/5 transition-colors"
                  >
                    Canjear Codigo
                  </button>
                </div>
              </div>

              {/* Right Column - Calendar */}
              <div className="lg:sticky lg:top-8 lg:self-start order-first lg:order-last">
                <div className="mb-4 sm:mb-6">
                  <h2 className="font-gazeta text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#8A4BAF] mb-2 sm:mb-3">
                    Agenda tu Sesion
                  </h2>
                  <p className="font-dm-sans text-gray-600">
                    Selecciona la fecha y hora que mejor te funcione
                  </p>
                </div>

                <BookingCalendar
                  session={session as any}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                  holidays={holidays}
                  blockedDates={blockedDates}
                  timezones={timezones}
                  timezoneNote={timezoneNote}
                  showTimezoneSelector={true}
                />

                {/* Continue Button */}
                {selectedDate && selectedTime && (
                  <div className="mt-6">
                    <button
                      onClick={() => handlePaymentClick('single')}
                      className="w-full bg-[#4944a4] text-white py-4 rounded-xl font-dm-sans font-semibold text-lg hover:bg-[#3d3a8a] transition-colors shadow-lg"
                    >
                      Continuar con el Pago
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-3 font-dm-sans">
                      Recibiras confirmacion por email
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-12 text-center">
                Como Funciona
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-2xl font-gazeta mx-auto mb-4">
                    1
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                    Elige tu Horario
                  </h3>
                  <p className="font-dm-sans text-gray-600 leading-relaxed">
                    Usa el calendario para seleccionar la fecha y hora que mejor te funcione.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-2xl font-gazeta mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                    Realiza el Pago
                  </h3>
                  <p className="font-dm-sans text-gray-600 leading-relaxed">
                    Completa tu reserva de forma segura. Recibiras confirmacion inmediata.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-2xl font-gazeta mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                    Conectate y Recibe
                  </h3>
                  <p className="font-dm-sans text-gray-600 leading-relaxed">
                    Recibiras el enlace de Zoom y una guia de preparacion por email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-20 bg-[#f8f0f5]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-12 text-center">
                Preguntas Frecuentes
              </h2>

              <div className="space-y-4">
                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Como son las sesiones online?</span>
                    <svg className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Las sesiones online se realizan a traves de videollamada (Zoom). Recibiras el enlace por email antes de la sesion. Solo necesitas una conexion a internet estable y un espacio tranquilo donde puedas relajarte.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Puedo cancelar o reprogramar mi sesion?</span>
                    <svg className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Puedes cancelar o reprogramar con al menos 24 horas de anticipacion sin ningun cargo. Cambios con menos de 24 horas estan sujetos a disponibilidad.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Como me preparo para la sesion?</span>
                    <svg className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Ven con mente abierta y corazon receptivo. Busca un espacio comodo y tranquilo. Te enviare instrucciones mas especificas por email despues de tu reserva.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Las sesiones quedan grabadas?</span>
                    <svg className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Si, con tu autorizacion puedo grabarte la sesion para que puedas revisarla despues. La grabacion es confidencial y solo tu tendras acceso a ella.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Que incluye el pack de 8 sesiones?</span>
                    <svg className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    El pack incluye 8 sesiones individuales de {sessionDetails.duration} minutos (pagas 7, la octava es gratis). Al comprar recibiras un codigo unico que te permite reservar cada sesion cuando quieras. El codigo tiene validez de 1 ano desde la compra.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <PaymentMethodSelector
          onMethodSelect={handlePaymentMethodSelect}
          onCancel={() => {
            setShowPaymentModal(false)
            setError(null)
          }}
          isLoading={isProcessing}
          pricesCOP={PRICES[paymentType].COP}
          pricesUSD={PRICES[paymentType].USD}
          productName={paymentType === 'single'
            ? `Sesion Individual${selectedDate ? ` - ${selectedDate.toLocaleDateString('es-CO')} ${selectedTime}` : ''}`
            : 'Pack de 8 Sesiones'
          }
        />
      )}

      {/* Pack Code Redemption Modal */}
      {showPackCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-[#8A4BAF]" />
                </div>
                <h2 className="font-gazeta text-2xl text-[#8A4BAF]">
                  Canjear Codigo de Pack
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!validatedPack ? (
                // Code input step
                <div>
                  <label className="block font-dm-sans text-sm text-gray-600 mb-2">
                    Ingresa tu codigo de pack
                  </label>
                  <input
                    type="text"
                    value={packCode}
                    onChange={(e) => setPackCode(e.target.value.toUpperCase())}
                    placeholder="PACK-XXXXXX"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg font-dm-sans text-center text-lg tracking-wider focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20"
                  />
                  <p className="text-xs text-gray-500 mt-2 font-dm-sans">
                    El codigo fue enviado a tu email cuando compraste el pack
                  </p>
                </div>
              ) : (
                // Validated pack info
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-dm-sans font-semibold text-green-800">
                        Codigo valido
                      </span>
                    </div>
                    <p className="font-dm-sans text-sm text-green-700">
                      {validatedPack.packName}
                    </p>
                    <p className="font-dm-sans text-sm text-green-600 mt-1">
                      Sesiones disponibles: <strong>{validatedPack.sessionsRemaining}</strong> de {validatedPack.sessionsTotal}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="font-dm-sans text-sm text-gray-600 mb-4">
                      Selecciona una fecha y hora en el calendario y luego confirma tu reserva.
                    </p>

                    {selectedDate && selectedTime ? (
                      <div className="bg-[#f8f0f5] rounded-xl p-4 mb-4">
                        <p className="font-dm-sans text-sm text-gray-600">Tu sesion:</p>
                        <p className="font-gazeta text-lg text-[#8A4BAF]">
                          {selectedDate.toLocaleDateString('es-CO', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })} a las {selectedTime}
                        </p>
                      </div>
                    ) : (
                      <p className="text-amber-600 text-sm font-dm-sans mb-4">
                        Selecciona una fecha y hora en el calendario
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 space-y-3">
              {!validatedPack ? (
                <button
                  onClick={handleValidatePackCode}
                  disabled={isValidatingCode || !packCode.trim()}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    isValidatingCode || !packCode.trim()
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                  }`}
                >
                  {isValidatingCode ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validando...
                    </span>
                  ) : (
                    'Validar Codigo'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRedeemSession}
                  disabled={isRedeemingSession || !selectedDate || !selectedTime}
                  className={`w-full py-4 rounded-xl font-dm-sans font-semibold text-lg transition-colors ${
                    isRedeemingSession || !selectedDate || !selectedTime
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-[#4944a4] text-white hover:bg-[#3d3a8a]'
                  }`}
                >
                  {isRedeemingSession ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Reservando...
                    </span>
                  ) : (
                    'Confirmar Reserva'
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setShowPackCodeModal(false)
                  setValidatedPack(null)
                  setPackCode('')
                  setError(null)
                }}
                disabled={isValidatingCode || isRedeemingSession}
                className="w-full py-3 rounded-xl font-dm-sans text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-dm-sans">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-white/80 hover:text-white"
          >
            x
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-dm-sans flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 text-white/80 hover:text-white"
          >
            x
          </button>
        </div>
      )}
    </>
  )
}
