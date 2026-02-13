import { Mail, MapPin, Clock } from "lucide-react"
import Link from "next/link"

import { ContactForm } from "@/components/contact/ContactForm"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Contacto | Energía y Divinidad",
  description: "Ponte en contacto con Aleyda Paola Vargas. Estamos aquí para responder tus preguntas sobre sesiones de canalización, membresía y acompañamiento espiritual.",
}

export default async function ContactoPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-white">
      <Header session={session} />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#f8f0f5] to-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#8A4BAF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#654177]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-6">
              Contacto
            </h1>
            <p className="font-dm-sans text-lg sm:text-xl text-[#674c6a] max-w-2xl mx-auto">
              Estoy aquí para acompañarte en tu camino. Si tienes preguntas o deseas saber más sobre mis servicios, no dudes en escribirme.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16">

              {/* Contact Information */}
              <div>
                <h2 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-8">
                  Hablemos
                </h2>
                <p className="font-dm-sans text-[#4A4A4A] leading-relaxed mb-8">
                  Ya sea que busques claridad espiritual, tengas dudas sobre las sesiones de canalización, o simplemente quieras saber más sobre cómo puedo acompañarte, estoy aquí para escucharte.
                </p>

                {/* Contact Cards */}
                <div className="space-y-4 mb-10">
                  {/* WhatsApp - Primary */}
                  <a
                    href="https://wa.me/573151165921?text=Hola%20Aleyda%2C%20me%20gustaría%20obtener%20más%20información"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-5 bg-gradient-to-r from-[#25D366]/10 to-[#25D366]/5 rounded-2xl border border-[#25D366]/20 hover:border-[#25D366]/40 transition-all hover:shadow-lg"
                  >
                    <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-dm-sans text-[#25D366] font-semibold text-sm uppercase tracking-wide mb-1">
                        WhatsApp (Respuesta rápida)
                      </p>
                      <p className="font-dm-sans text-[#4A4A4A] text-lg">
                        +57 315 116 5921
                      </p>
                    </div>
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:contacto@energiaydivinidad.com"
                    className="group flex items-center gap-4 p-5 bg-gradient-to-r from-[#8A4BAF]/10 to-[#8A4BAF]/5 rounded-2xl border border-[#8A4BAF]/20 hover:border-[#8A4BAF]/40 transition-all hover:shadow-lg"
                  >
                    <div className="w-12 h-12 bg-[#8A4BAF] rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-dm-sans text-[#8A4BAF] font-semibold text-sm uppercase tracking-wide mb-1">
                        Correo electrónico
                      </p>
                      <p className="font-dm-sans text-[#4A4A4A] text-base sm:text-lg">
                        contacto@energiaydivinidad.com
                      </p>
                    </div>
                  </a>

                  {/* Location */}
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-[#eef1fa] to-[#eef1fa]/50 rounded-2xl border border-[#2D4CC7]/10">
                    <div className="w-12 h-12 bg-[#2D4CC7] rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-dm-sans text-[#2D4CC7] font-semibold text-sm uppercase tracking-wide mb-1">
                        Ubicación
                      </p>
                      <p className="font-dm-sans text-[#4A4A4A] text-lg">
                        Bogotá, Colombia
                      </p>
                      <p className="font-dm-sans text-[#674c6a] text-sm">
                        Sesiones online disponibles para todo el mundo
                      </p>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-[#f8f0f5] to-[#f8f0f5]/50 rounded-2xl border border-[#654177]/10">
                    <div className="w-12 h-12 bg-[#654177] rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-dm-sans text-[#654177] font-semibold text-sm uppercase tracking-wide mb-1">
                        Horario de atención
                      </p>
                      <p className="font-dm-sans text-[#4A4A4A] text-lg">
                        Lunes a Viernes: 9:00 - 18:00
                      </p>
                      <p className="font-dm-sans text-[#674c6a] text-sm">
                        Sábados: 10:00 - 14:00 (Hora Colombia)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-4">
                    Sígueme en redes
                  </h3>
                  <div className="flex gap-3">
                    <a
                      href="https://instagram.com/energiaydivinidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#4944a4]/10 hover:bg-[#4944a4] text-[#4944a4] hover:text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                      aria-label="Instagram"
                    >
                      <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a
                      href="https://facebook.com/energiaydivinidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#4944a4]/10 hover:bg-[#4944a4] text-[#4944a4] hover:text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                      aria-label="Facebook"
                    >
                      <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a
                      href="https://youtube.com/@energiaydivinidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#4944a4]/10 hover:bg-[#4944a4] text-[#4944a4] hover:text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                      aria-label="YouTube"
                    >
                      <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                    <a
                      href="https://tiktok.com/@energiaydivinidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-[#4944a4]/10 hover:bg-[#4944a4] text-[#4944a4] hover:text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                      aria-label="TikTok"
                    >
                      <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <ContactForm />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-[#f8f0f5]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Title */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#8A4BAF]" />
                <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF]">
                  Preguntas frecuentes
                </h2>
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#8A4BAF]" />
              </div>
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {/* FAQ 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10">
                <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3">
                  ¿Cómo son las sesiones de canalización?
                </h3>
                <p className="font-dm-sans text-[#4A4A4A] leading-relaxed">
                  Las sesiones se realizan de forma online a través de videollamada. Durante la sesión, me conecto con los Seres de Luz para transmitirte mensajes específicos para tu momento actual. Cada sesión es grabada y recibirás el audio para que puedas escucharlo cuando lo necesites.
                </p>
              </div>

              {/* FAQ 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10">
                <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3">
                  ¿Atienden a personas de otros países?
                </h3>
                <p className="font-dm-sans text-[#4A4A4A] leading-relaxed">
                  Por supuesto. Las sesiones son online, por lo que puedo atenderte estés donde estés. Coordinaremos un horario que funcione para ambos según tu zona horaria. Los pagos internacionales se procesan en USD a través de PayPal.
                </p>
              </div>

              {/* FAQ 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10">
                <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3">
                  ¿Cuánto tiempo tardan en responder?
                </h3>
                <p className="font-dm-sans text-[#4A4A4A] leading-relaxed">
                  Por WhatsApp suelo responder en pocas horas durante el horario de atención. Los correos electrónicos los respondo en un máximo de 24-48 horas hábiles. Si es urgente, te recomiendo contactarme por WhatsApp.
                </p>
              </div>

              {/* FAQ 4 */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10">
                <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3">
                  ¿Qué incluye la membresía?
                </h3>
                <p className="font-dm-sans text-[#4A4A4A] leading-relaxed">
                  La membresía incluye acceso a contenido exclusivo semanal, meditaciones guiadas, canalizaciones grupales y una comunidad privada de apoyo. Es ideal si deseas un acompañamiento continuo en tu camino espiritual.{" "}
                  <Link href="/membresia" className="text-[#8A4BAF] hover:underline font-medium">
                    Conoce más aquí
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-[#f8f0f5] to-[#efe8f2]">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-gazeta text-2xl sm:text-3xl text-[#8A4BAF] mb-4">
              ¿Lista para dar el siguiente paso?
            </h2>
            <p className="font-dm-sans text-[#674c6a] mb-8">
              Si sientes el llamado, reserva tu sesión de canalización y recibe los mensajes que tu alma necesita escuchar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sesiones"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#4944a4] text-white rounded-full hover:bg-[#3d3890] transition-all transform hover:scale-105 font-dm-sans text-base font-semibold shadow-xl"
              >
                Ver sesiones disponibles
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/membresia"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-[#8A4BAF] text-[#8A4BAF] rounded-full hover:bg-[#8A4BAF] hover:text-white transition-all font-dm-sans text-base font-semibold"
              >
                Conocer la membresía
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
