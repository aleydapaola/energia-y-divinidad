import { Crown, Calendar, Sparkles } from 'lucide-react'
import type { UserSubscription } from '@/types/membership'

interface MembershipHeaderProps {
  subscription: UserSubscription | null
  user: {
    name?: string | null
    email?: string | null
  }
}

export function MembershipHeader({ subscription, user }: MembershipHeaderProps) {
  if (!subscription) return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'TRIAL':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'PAST_DUE':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activa'
      case 'TRIAL':
        return 'Prueba'
      case 'PAST_DUE':
        return 'Pago pendiente'
      case 'CANCELLED':
        return 'Cancelada'
      default:
        return status
    }
  }

  return (
    <div className="bg-gradient-to-r from-[#8A4BAF]/15 via-[#654177]/10 to-[#f8f0f5] border-b border-[#e8d5e0]">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Saludo y membresía */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8A4BAF] to-[#654177] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="font-gazeta text-2xl text-[#4b316c]">
                  ¡Hola, {user.name || 'Miembro'}!
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-[#8A4BAF]" />
                  <span className="text-[#654177] font-dm-sans">
                    Membresía{' '}
                    <span className="font-semibold text-[#8A4BAF]">
                      {subscription.membershipTierName}
                    </span>
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(
                      subscription.status
                    )}`}
                  >
                    {getStatusLabel(subscription.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info de renovación */}
          <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-[#e8d5e0]">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-[#f8f0f5] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#8A4BAF]" />
              </div>
              <div>
                <span className="text-[#654177]/70 text-xs font-dm-sans block">
                  {subscription.cancelledAt ? 'Acceso hasta' : 'Próxima renovación'}
                </span>
                <span className="font-semibold text-[#654177] font-dm-sans">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
