import { Settings, Loader2 } from 'lucide-react'
import { Suspense } from 'react'

import { SubscriptionManager } from '@/components/membership/subscription-manager'
import { auth } from '@/lib/auth'
import { getActiveSubscription } from '@/lib/membership-access'

export const metadata = {
  title: 'Configuración | Membresía',
  description: 'Gestiona tu suscripción y configuración de membresía',
}

export default async function ConfiguracionPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const subscription = await getActiveSubscription(session.user.id)

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-[#e8d5e0]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f8f0f5] flex items-center justify-center">
          <Settings className="w-8 h-8 text-[#8A4BAF]" />
        </div>
        <p className="text-[#654177] font-dm-sans text-lg mb-2">
          No tienes una membresía activa
        </p>
        <p className="text-sm text-[#654177]/60 font-dm-sans">
          Suscríbete para acceder a contenido exclusivo
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header de la sección */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-gazeta text-3xl text-[#4b316c]">
              Configuración
            </h1>
            <p className="text-[#654177]/70 font-dm-sans text-sm">
              Gestiona tu suscripción, método de pago y preferencias
            </p>
          </div>
        </div>
      </div>

      {/* Gestor de suscripción */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
              <span className="text-sm text-[#654177] font-dm-sans">Cargando...</span>
            </div>
          </div>
        }
      >
        <SubscriptionManager subscription={subscription} />
      </Suspense>
    </div>
  )
}
