import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { hasActiveMembership, getActiveSubscription } from '@/lib/membership-access'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MembershipNav } from '@/components/membership/membership-nav'
import { MembershipHeader } from '@/components/membership/membership-header'

interface MembershipLayoutProps {
  children: ReactNode
}

export default async function MembershipLayout({ children }: MembershipLayoutProps) {
  const session = await auth()

  // Verificar autenticación
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/membresia/publicaciones')
  }

  // Verificar membresía activa
  const hasMembership = await hasActiveMembership(session.user.id)

  if (!hasMembership) {
    redirect('/membresia')
  }

  // Obtener datos de suscripción para el header
  const subscription = await getActiveSubscription(session.user.id)

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f0f5]">
      {/* Header global del sitio */}
      <Header session={session} />

      {/* Header con información de membresía */}
      <MembershipHeader subscription={subscription} user={session.user} />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de navegación */}
          <aside className="lg:w-72 flex-shrink-0">
            <MembershipNav subscription={subscription} />
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Footer global del sitio */}
      <Footer />
    </div>
  )
}
