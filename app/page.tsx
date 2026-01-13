import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import Link from "next/link"
import Image from "next/image"
import MeditationCard from "@/components/meditaciones/MeditationCard"
import { getFeaturedFreeContent, type FreeContent } from "@/lib/sanity/queries/freeContent"

export default async function HomePage() {
  // Try to fetch featured meditations, fallback to empty array if Sanity not configured
  let featuredMeditations: FreeContent[] = []
  try {
    featuredMeditations = await getFeaturedFreeContent(3)
  } catch (error) {
    console.log('Sanity not configured yet, skipping featured meditations')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header session={null} />

      {/* Hero Section with New Design */}
      <section className="relative min-h-[85vh] sm:min-h-[80vh] lg:min-h-[85vh] w-full overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/images/ethereal-background.jpg)' }}
        />

        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent"></div>

        {/* Hero Content Grid */}
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-12 h-full min-h-[85vh] sm:min-h-[80vh] lg:min-h-[85vh]">
          {/* Image positioned absolutely at bottom right */}
          <div className="hidden lg:block absolute bottom-0 right-0 w-1/2 h-full pointer-events-none overflow-visible">
            <img
              src="/images/chica-removebg-preview.png"
              alt="Guía espiritual"
              className="absolute bottom-0 right-4 h-[calc(100%-2rem)] w-auto object-contain object-bottom"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full flex items-center">
            {/* Left Side - Text Content */}
            <div className="text-white max-w-2xl py-12 lg:py-20 relative z-10">
              <div className="space-y-1">
                <h1 className="font-gazeta text-[2.3rem] sm:text-[2.85rem] md:text-[3.35rem] lg:text-[3.6rem] leading-[1.1] text-[#654177] drop-shadow-lg text-left whitespace-nowrap max-w-[520px] -ml-1">
                  Canalización personal
                </h1>

                <p className="font-gazeta text-[1.5rem] sm:text-[1.85rem] md:text-[2.2rem] lg:text-[2.35rem] text-[#674c6a] leading-[1.1] drop-shadow-md text-left whitespace-nowrap max-w-[520px] tracking-normal">
                  para recibir guía clara y amorosa
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] leading-relaxed drop-shadow-md">
                  Un espacio íntimo para escuchar lo <span className="font-semibold">esencial</span>,
                </p>
                <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] leading-relaxed drop-shadow-md">
                  integrarlo con calma y salir con un siguiente paso en paz.
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[#654177] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] drop-shadow-md">
                    Mensaje central para tu momento actual
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[#654177] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] drop-shadow-md">
                    Integración práctica para tu vida diaria
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[#654177] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] drop-shadow-md">
                    Acompañamiento desde el amor y la serenidad
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 pt-6">
                <Link
                  href="/sesiones"
                  className="inline-flex items-center justify-center gap-2 py-3 sm:py-4 bg-[#4944a4] hover:bg-[#3d3890] text-white rounded-full transition-all transform hover:scale-105 font-dm-sans text-base font-semibold shadow-2xl w-[270px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Reservar sesión personal
                </Link>

                <Link
                  href="/membresia"
                  className="inline-flex items-center justify-center gap-2 py-3 sm:py-4 bg-[#f0e2e8] hover:bg-[#e5d6dc] text-[#7b6277] rounded-full transition-all transform hover:scale-105 font-dm-sans text-base font-semibold shadow-2xl w-[270px]"
                >
                  Ver membresía
                </Link>
              </div>

              {/* Small text below buttons */}
              <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] pt-6 drop-shadow-md whitespace-nowrap">
                Empieza con una sesión. Si quieres continuidad, la membresía te acompaña.
              </p>
            </div>

            {/* Right Side - Empty space for image that's positioned absolutely */}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      {/* ¿Te resuena esto? Section */}
      <section className="relative py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8f0f5] via-[#f5eaf2] to-[#f0e5ef]"></div>

        {/* Decorative sparkles/stars */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-white/60 rounded-full blur-[1px]"></div>
        <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white/50 rounded-full blur-[1px]"></div>
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white/40 rounded-full blur-[1px]"></div>
        <div className="absolute bottom-10 right-1/3 w-1.5 h-1.5 bg-white/50 rounded-full blur-[1px]"></div>

        <div className="relative container mx-auto px-4">
          {/* Title with decorative lines */}
          <div className="flex items-center justify-center gap-4 mb-12 sm:mb-14 md:mb-16">
            <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#8A4BAF]"></div>
            <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-[#8A4BAF] text-center">
              ¿Te resuena esto?
            </h2>
            <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#8A4BAF]"></div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-12 sm:mb-14">
            {/* Card 1 - Sientes señales */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF] mb-4 text-center">
                Sientes señales
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Sincronicidades e intuiciones</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Señales repetidas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Intuición más activa</span>
                </li>
              </ul>
            </div>

            {/* Card 2 - Buscas claridad */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF] mb-4 text-center">
                Buscas claridad
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Entender lo que estás viviendo</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Tomar decisiones con calma</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Comprender tu proceso de cambio</span>
                </li>
              </ul>
            </div>

            {/* Card 3 - Deseas acompañamiento */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF] mb-4 text-center">
                Deseas acompañamiento
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Canalización personalizada</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Escucha y guía consciente</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2 flex-shrink-0"></span>
                  <span className="font-dm-sans text-base text-[#4A4A4A]">Sentirte acompañado</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link
              href="/sesiones"
              className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 bg-[#2D4CC7] hover:bg-[#2541a8] text-white rounded-full transition-all transform hover:scale-105 font-dm-sans text-base sm:text-lg font-semibold shadow-xl"
            >
              Reservar sesión personal
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonios Section - Prueba social temprana */}
      <section className="relative bg-white py-16 sm:py-20 md:py-24 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#f8f0f5]/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#eef1fa]/50 rounded-full blur-3xl"></div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 sm:mb-14 md:mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#8A4BAF]"></div>
                <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF]">
                  Lo que dicen quienes han vivido la experiencia
                </h2>
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#8A4BAF]"></div>
              </div>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Testimonial 1 - Real */}
              <div className="bg-gradient-to-b from-[#f8f0f5]/50 to-white rounded-2xl p-6 sm:p-8 shadow-lg border border-[#8A4BAF]/5 hover:shadow-xl transition-all">
                {/* Quote icon */}
                <div className="mb-4">
                  <svg className="w-8 h-8 text-[#8A4BAF]/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                {/* Quote text */}
                <p className="font-dm-sans text-[#4A4A4A] text-base leading-relaxed mb-6 italic">
                  "Aleyda, te escribo con inmensa gratitud por ayudarme en mi proceso de sanación. Ha sido una etapa de acompañamiento y guía donde, con ayuda de los seres de luz, transformaron mi camino de vida. Cada día me empoderaba y hoy soy una persona diferente, llena de optimismo y convencida de que todos necesitamos ayuda. Gracias por transformar vidas."
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#8A4BAF] to-[#654177] rounded-full flex items-center justify-center text-white font-dm-sans font-semibold text-sm">
                    AC
                  </div>
                  <div>
                    <p className="font-dm-sans text-[#8A4BAF] font-semibold text-sm">Alicia C.M. <span className="text-xl">🇪🇨</span></p>
                    <p className="font-dm-sans text-[#674c6a] text-xs">Proceso de Sanación</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 - Real */}
              <div className="bg-gradient-to-b from-[#eef1fa]/50 to-white rounded-2xl p-6 sm:p-8 shadow-lg border border-[#2D4CC7]/5 hover:shadow-xl transition-all">
                {/* Quote icon */}
                <div className="mb-4">
                  <svg className="w-8 h-8 text-[#2D4CC7]/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                {/* Quote text */}
                <p className="font-dm-sans text-[#4A4A4A] text-base leading-relaxed mb-6 italic">
                  "Es sorprendente la conexión que tiene Aleyda con otras dimensiones, con seres de luz, con guías espirituales. La información que da es precisa y entendible. Ella también le hizo una sesión a mi amiga y a mi hijo y quedaron súper impresionados. Toda esa información nos ha ayudado para ser mejores seres humanos y crecer como espíritus. Muchas gracias Aleyda por ser y por estar."
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#2D4CC7] to-[#4944a4] rounded-full flex items-center justify-center text-white font-dm-sans font-semibold text-sm">
                    ML
                  </div>
                  <div>
                    <p className="font-dm-sans text-[#2D4CC7] font-semibold text-sm">Mary Lolita A. <span className="text-xl">🇺🇸</span></p>
                    <p className="font-dm-sans text-[#4a5a7a] text-xs">Sesión de Canalización</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-gradient-to-b from-[#f8f0f5]/50 to-white rounded-2xl p-6 sm:p-8 shadow-lg border border-[#8A4BAF]/5 hover:shadow-xl transition-all md:col-span-2 lg:col-span-1">
                {/* Quote icon */}
                <div className="mb-4">
                  <svg className="w-8 h-8 text-[#8A4BAF]/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                {/* Quote text */}
                <p className="font-dm-sans text-[#4A4A4A] text-base leading-relaxed mb-6 italic">
                  "Llegué buscando respuestas y encontré mucho más: claridad, paz y un camino. Aleyda tiene un don especial para transmitir los mensajes con amor."
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#8A4BAF] to-[#654177] rounded-full flex items-center justify-center text-white font-dm-sans font-semibold text-sm">
                    AR
                  </div>
                  <div>
                    <p className="font-dm-sans text-[#8A4BAF] font-semibold text-sm">Andrea R.</p>
                    <p className="font-dm-sans text-[#674c6a] text-xs">Sesión de Canalización</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ¿Cómo quieres comenzar? - Servicios principales */}
      <section className="relative py-16 sm:py-20 md:py-24 bg-gradient-to-b from-[#f8f0f5] via-[#f5eaf2] to-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#8A4BAF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#2D4CC7]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div className="relative container mx-auto px-4">
          {/* Title */}
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-4">
              ¿Cómo quieres comenzar?
            </h2>
            <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] max-w-2xl mx-auto">
              Dos formas de recibir guía y acompañamiento en tu camino
            </p>
          </div>

          {/* Two paths grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mb-10 sm:mb-12">

            {/* Card 1 - Sesión Individual */}
            <div className="group relative bg-white rounded-2xl p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#8A4BAF]/10 flex flex-col">
              {/* Icon */}
              <div className="w-14 h-14 mb-6 bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-[#8A4BAF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="font-gazeta text-2xl sm:text-3xl text-[#8A4BAF] mb-2">
                Sesión individual
              </h3>

              {/* Subtitle */}
              <p className="font-dm-sans text-[#8A4BAF] text-sm font-medium mb-4">
                Para un momento puntual de claridad
              </p>

              {/* Description */}
              <p className="font-dm-sans text-[#674c6a] text-base leading-relaxed mb-6 min-h-[72px]">
                Una canalización personalizada donde recibes mensajes específicos para tu situación actual. Ideal si buscas respuestas concretas.
              </p>

              {/* Benefits list */}
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8A4BAF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Mensaje canalizado para tu momento</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8A4BAF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Espacio para tus preguntas</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8A4BAF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Grabación de la sesión incluida</span>
                </li>
              </ul>

              {/* CTA */}
              <Link
                href="/sesiones"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#4944a4] hover:bg-[#3d3890] text-white rounded-full transition-all font-dm-sans text-base font-semibold shadow-lg group-hover:shadow-xl mt-auto"
              >
                Ver sesiones disponibles
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Card 2 - Membresía */}
            <div className="group relative bg-white rounded-2xl p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#2D4CC7]/10 flex flex-col">
              {/* Icon */}
              <div className="w-14 h-14 mb-6 bg-gradient-to-br from-[#2D4CC7]/10 to-[#4944a4]/10 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-[#2D4CC7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="font-gazeta text-2xl sm:text-3xl text-[#2D4CC7] mb-2">
                Membresía
              </h3>

              {/* Subtitle */}
              <p className="font-dm-sans text-[#2D4CC7] text-sm font-medium mb-4">
                Para acompañamiento continuo en tu camino
              </p>

              {/* Description */}
              <p className="font-dm-sans text-[#4a5a7a] text-base leading-relaxed mb-6 min-h-[72px]">
                Acceso a contenido exclusivo, meditaciones guiadas y comunidad. Perfecto si deseas integrar la espiritualidad en tu día a día.
              </p>

              {/* Benefits list */}
              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#2D4CC7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Contenido nuevo cada semana</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#2D4CC7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Meditaciones y canalizaciones exclusivas</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#2D4CC7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-dm-sans text-sm text-[#4A4A4A]">Comunidad privada de apoyo</span>
                </li>
              </ul>

              {/* CTA */}
              <Link
                href="/membresia"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#2D4CC7] hover:bg-[#2541a8] text-white rounded-full transition-all font-dm-sans text-base font-semibold shadow-lg group-hover:shadow-xl mt-auto"
              >
                Conocer la membresía
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Help text + Events mention */}
          <div className="text-center space-y-4">
            <p className="font-dm-sans text-[#674c6a] text-base">
              ¿No sabes cuál elegir?{' '}
              <a
                href="https://wa.me/573151165921"
                className="text-[#8A4BAF] hover:text-[#654177] font-medium underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Escríbeme por WhatsApp
              </a>
            </p>
            <p className="font-dm-sans text-[#9a9a9a] text-sm">
              También organizamos{' '}
              <Link href="/eventos" className="text-[#8A4BAF] hover:text-[#654177] font-medium">
                talleres y eventos grupales
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Sobre mí Section */}
      <section className="relative bg-gradient-to-b from-[#f8f0f5] via-[#f5eaf2] to-white py-16 sm:py-20 md:py-24 lg:py-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 md:mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#8A4BAF]"></div>
                <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF]">
                  Sobre mí
                </h2>
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#8A4BAF]"></div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
              {/* Image - Takes 2 columns */}
              <div className="lg:col-span-2 order-1">
                <div className="relative max-w-md mx-auto lg:max-w-none">
                  {/* Glow effect */}
                  <div className="absolute -inset-6 bg-gradient-to-br from-[#8A4BAF]/20 via-[#654177]/15 to-transparent rounded-3xl blur-3xl opacity-60"></div>

                  {/* Image container */}
                  <div className="relative">
                    <Image
                      src="/images/AleydaPirineo2-768x622.jpg.jpeg"
                      alt="Aleyda Paola Vargas - Canalizadora y chamana profesional, fundadora de Energía y Divinidad"
                      title="Aleyda Paola Vargas - Canalizadora y chamana profesional"
                      width={768}
                      height={622}
                      className="relative rounded-2xl shadow-2xl object-cover w-full h-auto"
                    />

                    {/* Decorative corner accent */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#8A4BAF] to-[#654177] rounded-2xl opacity-20 -z-10"></div>
                  </div>
                </div>
              </div>

              {/* Text Content - Takes 3 columns */}
              <div className="lg:col-span-3 order-2 space-y-5 md:space-y-6">
                <div>
                  <h3 className="font-gazeta text-2xl sm:text-3xl md:text-4xl text-[#8A4BAF] leading-snug mb-4 md:mb-5">
                    Así me descubrí como canal de Luz
                  </h3>

                  <div className="space-y-4 md:space-y-5">
                    <p className="font-dm-sans text-base md:text-lg text-[#4A4A4A] leading-relaxed">
                      Soy <span className="font-semibold text-[#8A4BAF]">Aleyda Paola Vargas</span>, canalizadora y chamana profesional.
                    </p>

                    <p className="font-dm-sans text-base md:text-lg text-[#4A4A4A] leading-relaxed">
                      Mi camino de luz inició hace 14 años, con la muerte de mi abuelo, quien me llevó a conectarme con la fuente.
                    </p>

                    <p className="font-dm-sans text-base md:text-lg text-[#4A4A4A] leading-relaxed">
                      Hoy me dedico a compartir mis dones con el mundo, ayudándoles a sanar y a encontrar respuestas en los seres de luz para lograr una evolución del ser.
                    </p>

                    <div className="relative pl-6 border-l-4 border-[#8A4BAF] py-2">
                      <p className="font-dm-sans text-base md:text-lg text-[#674c6a] leading-relaxed italic">
                        "Por medio de la sanación, la contención y los mensajes que nutren el alma, guiando el camino a un nuevo despertar de conciencia."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/sobre-mi"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#4944a4] text-white rounded-full hover:bg-[#3d3890] transition-all transform hover:scale-105 font-dm-sans text-base font-semibold shadow-xl group"
                  >
                    Conoce mi historia
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-20 right-0 w-64 h-64 bg-[#8A4BAF]/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-[#654177]/5 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* Academia Section */}
      <section className="relative bg-white py-16 sm:py-20 md:py-24 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#eef1fa]/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#f8f0f5]/50 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12 sm:mb-14 md:mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#2D4CC7]"></div>
                <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#2D4CC7]">
                  Academia de Formación
                </h2>
                <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#2D4CC7]"></div>
              </div>
              <p className="font-dm-sans text-base sm:text-lg text-[#4a5a7a] max-w-3xl mx-auto">
                Aprende, desarrolla y profundiza en tu camino espiritual con nuestros cursos y talleres
              </p>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Card 1 - Aprende a Canalizar */}
              <div className="group bg-gradient-to-b from-white to-[#eef1fa]/30 rounded-2xl shadow-lg p-6 sm:p-8 border border-[#2D4CC7]/10 hover:shadow-xl transition-all">
                <div className="flex justify-center mb-5">
                  <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#2D4CC7]/10 to-[#4944a4]/10 rounded-full">
                    <svg className="w-7 h-7 text-[#2D4CC7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-gazeta text-xl sm:text-2xl text-[#2D4CC7] mb-3 text-center">
                  Aprende a Canalizar
                </h3>
                <p className="font-dm-sans text-sm sm:text-base text-[#4A4A4A] leading-relaxed text-center mb-5">
                  Descubre y desarrolla tu capacidad de canalización para conectar con los seres de luz.
                </p>
                <div className="text-center">
                  <Link
                    href="/academia/aprende-a-canalizar"
                    className="inline-flex items-center gap-1 text-[#2D4CC7] hover:text-[#2541a8] font-dm-sans text-sm font-medium transition-colors group-hover:gap-2"
                  >
                    Más información
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card 2 - Guías Prácticas */}
              <div className="group bg-gradient-to-b from-white to-[#eef1fa]/30 rounded-2xl shadow-lg p-6 sm:p-8 border border-[#2D4CC7]/10 hover:shadow-xl transition-all">
                <div className="flex justify-center mb-5">
                  <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#2D4CC7]/10 to-[#4944a4]/10 rounded-full">
                    <svg className="w-7 h-7 text-[#2D4CC7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-gazeta text-xl sm:text-2xl text-[#2D4CC7] mb-3 text-center">
                  Guías Prácticas
                </h3>
                <p className="font-dm-sans text-sm sm:text-base text-[#4A4A4A] leading-relaxed text-center mb-5">
                  Herramientas y técnicas ancestrales para tu crecimiento y sanación personal.
                </p>
                <div className="text-center">
                  <Link
                    href="/academia/guias-practicas"
                    className="inline-flex items-center gap-1 text-[#2D4CC7] hover:text-[#2541a8] font-dm-sans text-sm font-medium transition-colors group-hover:gap-2"
                  >
                    Más información
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card 3 - Cursos y Talleres */}
              <div className="group bg-gradient-to-b from-white to-[#eef1fa]/30 rounded-2xl shadow-lg p-6 sm:p-8 border border-[#2D4CC7]/10 hover:shadow-xl transition-all">
                <div className="flex justify-center mb-5">
                  <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#2D4CC7]/10 to-[#4944a4]/10 rounded-full">
                    <svg className="w-7 h-7 text-[#2D4CC7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-gazeta text-xl sm:text-2xl text-[#2D4CC7] mb-3 text-center">
                  Cursos y Talleres
                </h3>
                <p className="font-dm-sans text-sm sm:text-base text-[#4A4A4A] leading-relaxed text-center mb-5">
                  Formaciones completas para profundizar en tu desarrollo espiritual y transformación.
                </p>
                <div className="text-center">
                  <Link
                    href="/academia/cursos-y-talleres"
                    className="inline-flex items-center gap-1 text-[#2D4CC7] hover:text-[#2541a8] font-dm-sans text-sm font-medium transition-colors group-hover:gap-2"
                  >
                    Más información
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center mt-10 sm:mt-12">
              <Link
                href="/academia"
                className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 bg-[#2D4CC7] hover:bg-[#2541a8] text-white rounded-full transition-all transform hover:scale-105 font-dm-sans text-base sm:text-lg font-semibold shadow-xl"
              >
                Explora todos los cursos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Meditaciones Gratis Section */}
      {featuredMeditations.length > 0 && (
        <section className="relative bg-gradient-to-b from-[#f8f0f5] via-[#f5eaf2] to-white py-16 sm:py-20 md:py-24 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-10 left-10 w-2 h-2 bg-white/60 rounded-full blur-[1px]"></div>
          <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white/50 rounded-full blur-[1px]"></div>
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white/40 rounded-full blur-[1px]"></div>

          <div className="relative container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center mb-12 sm:mb-14 md:mb-16">
                <div className="flex justify-center mb-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-full">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#8A4BAF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-[#8A4BAF]"></div>
                  <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF]">
                    Meditaciones Gratis
                  </h2>
                  <div className="hidden sm:block h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-[#8A4BAF]"></div>
                </div>
                <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] max-w-3xl mx-auto">
                  Descubre nuestras meditaciones guiadas gratuitas para tu crecimiento espiritual
                </p>
              </div>

              {/* Meditations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {featuredMeditations.map((meditation) => (
                  <MeditationCard key={meditation._id} meditation={meditation} />
                ))}
              </div>

              {/* CTA Button */}
              <div className="text-center mt-10 sm:mt-12">
                <Link
                  href="/meditaciones"
                  className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 bg-[#4944a4] hover:bg-[#3d3890] text-white rounded-full transition-all transform hover:scale-105 font-dm-sans text-base sm:text-lg font-semibold shadow-xl"
                >
                  Ver todas las meditaciones
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Section */}
      <section className="relative bg-gradient-to-b from-[#f8f0f5] via-[#efe8f2] to-[#e8e0eb] py-16 sm:py-20 md:py-24 overflow-hidden">
        {/* Decorative blurred elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8A4BAF]/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#654177]/8 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#8A4BAF]/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"></div>
        {/* Small sparkles */}
        <div className="absolute top-1/4 left-1/5 w-1.5 h-1.5 bg-[#8A4BAF]/20 rounded-full blur-[1px]"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-[#654177]/15 rounded-full blur-[1px]"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-[#8A4BAF]/15 rounded-full blur-[1px]"></div>

        <div className="relative container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-full">
                <svg className="w-8 h-8 text-[#8A4BAF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="font-gazeta text-2xl sm:text-3xl md:text-4xl text-[#8A4BAF] mb-4">
              Recibe 3 meditaciones gratis
            </h2>

            {/* Subtitle */}
            <p className="font-dm-sans text-base sm:text-lg text-[#674c6a] mb-8 max-w-lg mx-auto">
              Suscríbete y recibe meditaciones guiadas, contenido exclusivo y herramientas para tu camino espiritual
            </p>

            {/* Form */}
            <form className="flex flex-col gap-4 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Tu correo electrónico"
                required
                className="w-full px-5 py-3.5 bg-white border border-[#8A4BAF]/20 rounded-full text-[#4A4A4A] placeholder-[#9a9a9a] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans text-base text-center shadow-sm"
              />
              <button
                type="submit"
                className="w-full px-8 py-3.5 bg-[#4944a4] text-white rounded-full font-dm-sans text-base font-semibold hover:bg-[#3d3890] transition-all transform hover:scale-105 shadow-lg"
              >
                Suscribirme
              </button>
            </form>

            {/* Privacy note */}
            <p className="font-dm-sans text-xs text-[#9a9a9a] mt-4">
              Respetamos tu privacidad. Puedes darte de baja en cualquier momento.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
