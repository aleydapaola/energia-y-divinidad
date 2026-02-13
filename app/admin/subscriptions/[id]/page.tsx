import { ArrowLeft, User, CreditCard, Calendar, Clock, Shield } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      entitlements: {
        select: {
          id: true,
          type: true,
          revoked: true,
          expiresAt: true,
          resourceName: true,
        },
      },
    },
  })

  if (!subscription) {
    notFound()
  }

  // Get audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'subscription',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Get related membership orders
  const relatedOrders = await prisma.order.findMany({
    where: {
      userId: subscription.userId,
      orderType: 'MEMBERSHIP',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      createdAt: true,
    },
  })

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)} USD`
    }
    return `$${amount.toLocaleString('es-CO')} COP`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      PAST_DUE: 'bg-red-100 text-red-700',
      PAUSED: 'bg-yellow-100 text-yellow-700',
    }
    const labels: Record<string, string> = {
      ACTIVE: 'Activa',
      CANCELLED: 'Cancelada',
      PAST_DUE: 'Con Mora',
      PAUSED: 'Pausada',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-purple-100 text-purple-700',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    )
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      cancel: 'Cancelación',
      create: 'Creación',
      update: 'Actualización',
      status_change: 'Cambio de estado',
    }
    return labels[action] || action
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/subscriptions"
          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-gazeta text-3xl text-[#654177]">
            Suscripción: {subscription.membershipTierName}
          </h1>
          <p className="text-gray-600 font-dm-sans mt-1">
            ID: {subscription.id}
          </p>
        </div>
        {getStatusBadge(subscription.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <User className="w-5 h-5" />
              Información del Usuario
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Nombre</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {subscription.user.name || 'Sin nombre'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Email</p>
                <p className="font-medium text-gray-900 font-dm-sans">{subscription.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">ID Usuario</p>
                <Link
                  href={`/admin/users/${subscription.userId}`}
                  className="text-[#8A4BAF] hover:underline font-dm-sans"
                >
                  {subscription.userId}
                </Link>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" />
              Detalles de la Suscripción
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Plan</p>
                <p className="font-medium text-gray-900 font-dm-sans">{subscription.membershipTierName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Intervalo</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {subscription.billingInterval === 'MONTHLY' ? 'Mensual' : 'Anual'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Monto</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {formatAmount(Number(subscription.amount), subscription.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Proveedor de Pago</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {subscription.paymentProvider || 'N/A'}
                </p>
              </div>
              {subscription.stripeSubscriptionId && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-dm-sans">ID de Suscripción (Stripe)</p>
                  <p className="font-mono text-sm text-gray-900">{subscription.stripeSubscriptionId}</p>
                </div>
              )}
              {subscription.nequiSubscriptionId && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-dm-sans">ID de Suscripción (Nequi)</p>
                  <p className="font-mono text-sm text-gray-900">{subscription.nequiSubscriptionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              Período de Facturación
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Inicio del Período</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {formatDate(subscription.currentPeriodStart)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Fin del Período</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Creada</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {formatDateTime(subscription.createdAt)}
                </p>
              </div>
              {subscription.cancelledAt && (
                <div>
                  <p className="text-sm text-gray-500 font-dm-sans">Fecha de Cancelación</p>
                  <p className="font-medium text-red-600 font-dm-sans">
                    {formatDateTime(subscription.cancelledAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Entitlements */}
          {subscription.entitlements.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                Beneficios
              </h2>
              <div className="space-y-3">
                {subscription.entitlements.map((entitlement) => {
                  const isActive = !entitlement.revoked && (!entitlement.expiresAt || new Date(entitlement.expiresAt) > new Date())
                  return (
                    <div
                      key={entitlement.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isActive ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900 font-dm-sans">{entitlement.resourceName}</p>
                        <p className="text-xs text-gray-500 font-dm-sans">{entitlement.type}</p>
                        {entitlement.expiresAt && (
                          <p className="text-sm text-gray-500 font-dm-sans">
                            Expira: {formatDate(entitlement.expiresAt)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isActive ? 'Activo' : entitlement.revoked ? 'Revocado' : 'Expirado'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Audit History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              Historial de Acciones
            </h2>
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-[#8A4BAF] pl-3 py-1">
                    <p className="text-sm font-medium text-gray-900 font-dm-sans">
                      {getActionLabel(log.action)}
                    </p>
                    <p className="text-xs text-gray-500 font-dm-sans">
                      Por: {log.actorEmail}
                    </p>
                    {log.reason && (
                      <p className="text-xs text-gray-600 font-dm-sans mt-1">
                        &ldquo;{log.reason}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 font-dm-sans mt-1">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-dm-sans">
                No hay historial de acciones registrado.
              </p>
            )}
          </div>

          {/* Related Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] mb-4">
              Órdenes Relacionadas
            </h2>
            {relatedOrders.length > 0 ? (
              <div className="space-y-3">
                {relatedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-[#f8f0f5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#654177] font-dm-sans">
                        {order.orderNumber}
                      </span>
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                    <p className="text-sm text-gray-900 font-dm-sans mt-1">
                      {formatAmount(Number(order.amount), order.currency)}
                    </p>
                    <p className="text-xs text-gray-500 font-dm-sans">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-dm-sans">
                No hay órdenes relacionadas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
