"use client";

import { Calendar, Clock, Video, Heart, Sparkles, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BookingCalendar } from "@/components/booking/booking-calendar";

import type { Holiday, BlockedDateRange, Timezone } from "@/lib/sanity/queries/bookingSettings";

interface SessionForCalendar {
  _id: string;
  title: string;
  slug: { current: string };
  duration: number;
  price: number;
  priceUSD: number;
  maxAdvanceBooking: number;
  availabilitySchedule?: {
    monday?: Array<{ start: string; end: string }>;
    tuesday?: Array<{ start: string; end: string }>;
    wednesday?: Array<{ start: string; end: string }>;
    thursday?: Array<{ start: string; end: string }>;
    friday?: Array<{ start: string; end: string }>;
    saturday?: Array<{ start: string; end: string }>;
    sunday?: Array<{ start: string; end: string }>;
  };
}

interface SessionDetails {
  duration: number;
  deliveryMethod: string;
  availableDays: string;
  price: number;
  priceUSD: number;
  priceEUR: number;
  formattedPrice: string;
}

interface SesionesPageClientProps {
  session: SessionForCalendar;
  sessionDetails: SessionDetails;
  holidays: Holiday[];
  blockedDates: BlockedDateRange[];
  timezones: Timezone[];
  timezoneNote: string;
}

export function SesionesPageClient({
  session,
  sessionDetails,
  holidays,
  blockedDates,
  timezones,
  timezoneNote,
}: SesionesPageClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handlePaymentClick = (type: "single" | "pack") => {
    // Build checkout URL with booking data
    const params = new URLSearchParams();
    params.set("type", type);

    if (type === "single" && selectedDate && selectedTime) {
      params.set("date", selectedDate.toISOString());
      params.set("time", selectedTime);
    }

    // Redirect to dedicated checkout page
    router.push(`/checkout/sesion?${params.toString()}`);
  };

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
                Un espacio sagrado de acompanamiento personalizado donde juntas exploramos lo que
                necesitas en este momento de tu camino. Cada sesion es unica y se adapta a ti.
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
                  <h2 className="font-gazeta text-2xl text-[#8A4BAF] mb-6">Que puedes esperar?</h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">
                          Escucha Profunda
                        </h3>
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
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">
                          Sanacion Energetica
                        </h3>
                        <p className="font-dm-sans text-sm text-gray-600">
                          Trabajo con tu campo energetico para liberar bloqueos y restaurar el flujo
                          vital.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-[#8A4BAF]" />
                      </div>
                      <div>
                        <h3 className="font-gazeta text-lg text-[#654177] mb-1">
                          Mensajes Canalizados
                        </h3>
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
                      ${sessionDetails.priceUSD} USD | {sessionDetails.priceEUR} EUR
                    </p>
                  </div>
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
                      onClick={() => handlePaymentClick("single")}
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
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">Elige tu Horario</h3>
                  <p className="font-dm-sans text-gray-600 leading-relaxed">
                    Usa el calendario para seleccionar la fecha y hora que mejor te funcione.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-2xl font-gazeta mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">Realiza el Pago</h3>
                  <p className="font-dm-sans text-gray-600 leading-relaxed">
                    Completa tu reserva de forma segura. Recibiras confirmacion inmediata.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-2xl font-gazeta mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3">Conectate y Recibe</h3>
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
                    <svg
                      className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Las sesiones online se realizan a traves de videollamada (Zoom). Recibiras el
                    enlace por email antes de la sesion. Solo necesitas una conexion a internet
                    estable y un espacio tranquilo donde puedas relajarte.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Puedo cancelar o reprogramar mi sesion?</span>
                    <svg
                      className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Puedes cancelar o reprogramar con al menos 24 horas de anticipacion sin ningun
                    cargo. Cambios con menos de 24 horas estan sujetos a disponibilidad.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Como me preparo para la sesion?</span>
                    <svg
                      className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Ven con mente abierta y corazon receptivo. Busca un espacio comodo y tranquilo.
                    Te enviare instrucciones mas especificas por email despues de tu reserva.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Las sesiones quedan grabadas?</span>
                    <svg
                      className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    Si, con tu autorizacion puedo grabarte la sesion para que puedas revisarla
                    despues. La grabacion es confidencial y solo tu tendras acceso a ella.
                  </p>
                </details>

                <details className="bg-white rounded-xl shadow-md p-6 group">
                  <summary className="font-gazeta text-lg text-[#654177] cursor-pointer list-none flex items-center justify-between">
                    <span>Que incluye el pack de 8 sesiones?</span>
                    <svg
                      className="w-5 h-5 text-[#8A4BAF] transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <p className="mt-4 font-dm-sans text-gray-600 leading-relaxed">
                    El pack incluye 8 sesiones individuales de {sessionDetails.duration} minutos
                    (pagas 7, la octava es gratis). Al comprar recibiras un codigo unico que te
                    permite reservar cada sesion cuando quieras. El codigo tiene validez de 1 ano
                    desde la compra.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
