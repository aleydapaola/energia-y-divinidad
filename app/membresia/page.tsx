'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Sparkles, Heart, Users, LogIn, Crown, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PricingSection } from '@/components/membership/pricing-section'
import type { MembershipTier } from '@/types/membership'

export default function MembresiaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isChecking, setIsChecking] = useState(false)
  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [loadingTiers, setLoadingTiers] = useState(true)

  // Verificar si el usuario viene a cambiar de plan (desde configuración)
  const [currentSubscription, setCurrentSubscription] = useState<{
    tierId: string
    tierName: string
    status: string
  } | null>(null)

  useEffect(() => {
    // Verificar si ya tiene membresía activa
    async function checkMembership() {
      if (session?.user?.id && !isChecking) {
        setIsChecking(true)
        try {
          const response = await fetch('/api/membership/status')
          if (response.ok) {
            const data = await response.json()
            if (data.hasActiveMembership) {
              // Guardar datos de suscripción actual para mostrar en la UI
              setCurrentSubscription({
                tierId: data.subscription?.membershipTierId || '',
                tierName: data.subscription?.membershipTierName || '',
                status: data.subscription?.status || '',
              })
              // NO redirigir automáticamente - permitir que vean los planes para cambiar
            }
          }
        } catch (error) {
          console.error('Error checking membership:', error)
        } finally {
          setIsChecking(false)
        }
      }
    }

    checkMembership()
  }, [session, router, isChecking])

  useEffect(() => {
    // Cargar tiers desde Sanity
    async function fetchTiers() {
      try {
        const response = await fetch('/api/sanity/membership-tiers')
        if (response.ok) {
          const data = await response.json()
          setTiers(data)
        }
      } catch (error) {
        console.error('Error fetching tiers:', error)
      } finally {
        setLoadingTiers(false)
      }
    }

    fetchTiers()
  }, [])

  return (
    <>
      <Header session={session} />
      <div className="min-h-screen bg-[#f8f0f5] font-dm-sans">
        {/* Banner informativo para usuarios no autenticados */}
        {status === 'unauthenticated' && (
          <div className="bg-gradient-to-r from-[#8A4BAF] to-[#654177] text-white py-4 px-6">
            <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm md:text-base font-medium">
                  ¿Ya eres miembro? Inicia sesión para acceder a tu contenido exclusivo
                </p>
              </div>
              <Link
                href="/auth/signin?callbackUrl=/dashboard/membresia/publicaciones"
                className="flex items-center gap-2 bg-white text-[#654177] px-5 py-2 rounded-lg hover:bg-neutral-50 transition font-semibold text-sm whitespace-nowrap"
              >
                <LogIn size={18} />
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}

        {/* Banner para miembros existentes que quieren cambiar de plan */}
        {currentSubscription && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white py-4 px-6">
            <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="text-sm md:text-base font-medium">
                    Tu plan actual: <span className="font-bold">{currentSubscription.tierName}</span>
                  </p>
                  <p className="text-xs md:text-sm text-white/80">
                    Selecciona otro plan para hacer upgrade o downgrade
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/membresia/publicaciones"
                className="flex items-center gap-2 bg-white text-amber-600 px-5 py-2 rounded-lg hover:bg-neutral-50 transition font-semibold text-sm whitespace-nowrap"
              >
                <ArrowLeft size={18} />
                Volver a mi membresía
              </Link>
            </div>
          </div>
        )}

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#8A4BAF]/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#8A4BAF]/10 rounded-full">
              <Sparkles className="text-[#8A4BAF]" size={48} />
            </div>
          </div>
          <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#654177] mb-6">
            Club del Despertar Espiritual
          </h1>
          <p className="text-xl text-[#654177]/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            Un espacio sagrado de acompañamiento, conexión y expansión de conciencia,
            creado para quienes sienten el llamado a despertar su luz interior,
            fortalecer su vínculo con los Seres de Luz y avanzar con claridad en su camino espiritual.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6 text-center">
            ¿Qué encontrarás aquí?
          </h2>
          <p className="text-center text-[#654177]/70 mb-12 max-w-2xl mx-auto">
            Guía canalizada, meditaciones, encuentros y mensajes que te acompañarán en tu proceso de evolución personal y espiritual.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8A4BAF]/10 mb-4">
                <Heart className="text-[#8A4BAF]" size={32} />
              </div>
              <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                Meditaciones Canalizadas
              </h3>
              <p className="text-[#654177]/70">
                Cada meditación es guiada por un Ser de Luz, trabajando un propósito
                específico de sanación y evolución espiritual.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8A4BAF]/10 mb-4">
                <Sparkles className="text-[#8A4BAF]" size={32} />
              </div>
              <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                Códigos Sagrados
              </h3>
              <p className="text-[#654177]/70">
                Ciclos alineados con la energía del mes, el Ser de Luz que guía
                la canalización y el propósito espiritual del momento.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8A4BAF]/10 mb-4">
                <Users className="text-[#8A4BAF]" size={32} />
              </div>
              <h3 className="font-gazeta text-xl text-[#654177] mb-3">
                Encuentros en Vivo
              </h3>
              <p className="text-[#654177]/70">
                Encuentros online guiados por Seres de Luz con temáticas de sanación,
                activación espiritual y despertar de conciencia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-6 bg-[#eef1fa]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-4 text-center">
            Membresías Disponibles
          </h2>
          <p className="text-center text-[#654177]/70 mb-12 max-w-2xl mx-auto">
            Todos los planes incluyen acceso inmediato y puedes cancelar cuando quieras.
          </p>

          {loadingTiers ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A4BAF]"></div>
            </div>
          ) : tiers.length > 0 ? (
            <PricingSection
              tiers={tiers}
              isAuthenticated={status === 'authenticated'}
              currentTierId={currentSubscription?.tierId}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-[#654177]/60">No hay planes de membresía disponibles en este momento.</p>
              <p className="text-sm text-[#654177]/50 mt-2">Por favor, vuelve más tarde.</p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-12 text-center">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-6">
            <details className="border-b border-[#8A4BAF]/20 pb-6 cursor-pointer group">
              <summary className="font-semibold text-lg text-[#654177] mb-2 list-none flex items-center justify-between">
                <span>¿Puedo cancelar en cualquier momento?</span>
                <span className="text-[#8A4BAF] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#654177]/70 mt-3 leading-relaxed">
                Sí, puedes cancelar tu membresía cuando quieras desde tu panel de control.
                Si cancelas, mantendrás acceso hasta el final del período que ya pagaste.
              </p>
            </details>

            <details className="border-b border-[#8A4BAF]/20 pb-6 cursor-pointer group">
              <summary className="font-semibold text-lg text-[#654177] mb-2 list-none flex items-center justify-between">
                <span>¿Qué pasa con el contenido si cancelo?</span>
                <span className="text-[#8A4BAF] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#654177]/70 mt-3 leading-relaxed">
                El contenido de membresía solo es accesible mientras estés activo. Sin embargo,
                cualquier sesión individual o curso que hayas comprado permanece disponible de por vida.
              </p>
            </details>

            <details className="border-b border-[#8A4BAF]/20 pb-6 cursor-pointer group">
              <summary className="font-semibold text-lg text-[#654177] mb-2 list-none flex items-center justify-between">
                <span>¿Puedo cambiar de plan?</span>
                <span className="text-[#8A4BAF] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#654177]/70 mt-3 leading-relaxed">
                Sí, puedes cambiar entre niveles de membresía en cualquier momento desde
                tu área de miembros. Los cambios de plan se ajustan automáticamente.
              </p>
            </details>

            <details className="border-b border-[#8A4BAF]/20 pb-6 cursor-pointer group">
              <summary className="font-semibold text-lg text-[#654177] mb-2 list-none flex items-center justify-between">
                <span>¿Puedo tener membresía y comprar sesiones individuales?</span>
                <span className="text-[#8A4BAF] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#654177]/70 mt-3 leading-relaxed">
                ¡Por supuesto! La membresía te da acceso a contenido exclusivo mientras estés activo,
                y también puedes reservar sesiones individuales para trabajar de manera personalizada.
              </p>
            </details>

            <details className="pb-6 cursor-pointer group">
              <summary className="font-semibold text-lg text-[#654177] mb-2 list-none flex items-center justify-between">
                <span>¿Qué incluye la biblioteca de contenido?</span>
                <span className="text-[#8A4BAF] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#654177]/70 mt-3 leading-relaxed">
                La biblioteca incluye videos exclusivos, meditaciones guiadas, audios de canalización,
                masterclasses completas y documentos descargables. El contenido se actualiza constantemente
                con nuevo material.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-[#8A4BAF]/10 to-[#f8f0f5]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-4">
            ¿Sientes el llamado?
          </h2>
          <p className="text-[#654177]/80 mb-8 text-lg">
            Únete al Club del Despertar Espiritual y comienza tu proceso de evolución
          </p>
          <Link
            href="/membresia/checkout"
            className="inline-block bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-semibold text-lg px-10 py-4 rounded-lg transition-colors"
          >
            Comenzar Ahora
          </Link>
        </div>
      </section>
      </div>
      <Footer />
    </>
  )
}
