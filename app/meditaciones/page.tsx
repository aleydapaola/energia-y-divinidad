import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import MeditationCard from '@/components/meditaciones/MeditationCard'
import { getAllFreeContent } from '@/lib/sanity/queries/freeContent'

export const metadata: Metadata = {
  title: 'Meditaciones Gratis | Energía y Divinidad',
  description: 'Meditaciones guiadas gratuitas para tu crecimiento espiritual. Conecta con tu ser interior, los seres de luz y encuentra paz y sanación.',
  keywords: [
    'meditaciones gratis',
    'meditaciones guiadas',
    'meditación espiritual',
    'crecimiento personal',
    'sanación espiritual',
    'meditación chakras',
    'abundancia',
    'paz interior',
  ],
  openGraph: {
    title: 'Meditaciones Gratis | Energía y Divinidad',
    description: 'Meditaciones guiadas gratuitas para tu crecimiento espiritual y sanación interior.',
    type: 'website',
  },
}

export default async function MeditacionesPage() {
  const meditations = await getAllFreeContent()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header session={null} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#FFF8F0] to-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gradient-to-br from-[#a87819]/10 to-[#d4a574]/10 rounded-full">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#a87819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-5 sm:mb-6 leading-tight">
              Meditaciones Gratis
            </h1>

            {/* Description */}
            <p className="font-sans text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed font-normal max-w-2xl mx-auto mb-6">
              Descubre nuestra colección de meditaciones guiadas gratuitas para tu crecimiento espiritual.
              Conecta con tu ser interior, los seres de luz y encuentra paz y sanación.
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="font-sans text-3xl font-semibold text-brand">
                  {meditations.length}
                </div>
                <div className="font-sans text-sm text-gray-600 uppercase tracking-wide">
                  {meditations.length === 1 ? 'Meditación' : 'Meditaciones'}
                </div>
              </div>
              <div className="text-center">
                <div className="font-sans text-3xl font-semibold text-brand">
                  100%
                </div>
                <div className="font-sans text-sm text-gray-600 uppercase tracking-wide">
                  Gratis
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meditations Grid */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {meditations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-gray-100 rounded-full">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-gazeta text-xl md:text-2xl text-[#654177] mb-3">
                  Próximamente
                </h3>
                <p className="font-sans text-base text-gray-600 max-w-md mx-auto">
                  Estamos preparando meditaciones maravillosas para ti.
                  Suscríbete a nuestra newsletter para recibir notificaciones.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {meditations.map((meditation) => (
                  <MeditationCard key={meditation._id} meditation={meditation} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-white to-[#FFF8F0] py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-4 leading-snug">
              ¿Quieres ir más profundo?
            </h2>
            <p className="font-sans text-base md:text-lg text-gray-700 leading-relaxed font-normal mb-6">
              Descubre nuestras sesiones individuales de canalización y únete a nuestra membresía
              para acceso exclusivo a contenido premium, sesiones grupales y mucho más.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/sesiones"
                className="inline-block px-8 py-4 bg-brand text-white rounded-lg hover:bg-brand/90 transition-all transform hover:scale-105 font-sans text-base font-semibold shadow-lg uppercase tracking-wide"
              >
                Ver Sesiones
              </a>
              <a
                href="/membresia"
                className="inline-block px-8 py-4 bg-white text-brand border-2 border-brand rounded-lg hover:bg-brand/5 transition-all transform hover:scale-105 font-sans text-base font-semibold shadow-lg uppercase tracking-wide"
              >
                Conocer Membresía
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
