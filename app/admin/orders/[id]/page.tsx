import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          resourceName: true,
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  // Obtener audit logs relacionados
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'order',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Obtener email logs relacionados
  const emailLogs = await prisma.emailLog.findMany({
    where: {
      entityType: 'order',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <Clock className="w-5 h-5" />, label: 'Pendiente' },
      PROCESSING: { color: 'text-blue-700', bg: 'bg-blue-100', icon: <AlertCircle className="w-5 h-5" />, label: 'Procesando' },
      COMPLETED: { color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle className="w-5 h-5" />, label: 'Completado' },
      FAILED: { color: 'text-red-700', bg: 'bg-red-100', icon: <XCircle className="w-5 h-5" />, label: 'Fallido' },
      REFUNDED: { color: 'text-purple-700', bg: 'bg-purple-100', icon: <AlertCircle className="w-5 h-5" />, label: 'Reembolsado' },
      CANCELLED: { color: 'text-gray-700', bg: 'bg-gray-100', icon: <XCircle className="w-5 h-5" />, label: 'Cancelado' },
    }
    return config[status] || config.PENDING
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'N/A'
    const labels: Record<string, string> = {
      WOMPI_CARD: 'Tarjeta de crédito (Wompi)',
      WOMPI_NEQUI: 'Nequi',
      WOMPI_PSE: 'PSE',
      EPAYCO_CARD: 'Tarjeta de crédito (ePayco)',
      EPAYCO_PAYPAL: 'PayPal',
      EPAYCO_PSE: 'PSE (ePayco)',
      STRIPE: 'Stripe',
      MANUAL_NEQUI: 'Nequi (Manual)',
      MANUAL_TRANSFER: 'Transferencia bancaria',
      FREE: 'Gratis',
    }
    return labels[method] || method
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SESSION: 'Sesión de Canalización',
      EVENT: 'Evento',
      MEMBERSHIP: 'Membresía',
      COURSE: 'Curso',
      PREMIUM_CONTENT: 'Contenido Premium',
      PRODUCT: 'Producto',
    }
    return labels[type] || type
  }

  const statusConfig = getStatusConfig(order.paymentStatus)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-gazeta text-2xl text-[#654177]">
            Orden #{order.orderNumber}
          </h1>
          <p className="text-gray-500 font-dm-sans text-sm">
            Creada el {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className={`${statusConfig.bg} rounded-xl p-6`}>
            <div className="flex items-center gap-3">
              <div className={statusConfig.color}>{statusConfig.icon}</div>
              <div>
                <p className={`text-lg font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </p>
                <p className="text-sm text-gray-600">
                  Estado del pago
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] mb-4">Detalles del pedido</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-[#f8f0f5]/50 rounded-lg">
                <Package className="w-5 h-5 text-[#8A4BAF] mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-[#654177] font-dm-sans">{order.itemName}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">{getTypeLabel(order.orderType)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#654177] font-dm-sans">
                    {formatAmount(Number(order.amount), order.currency)}
                  </p>
                  {order.discountCode && (
                    <p className="text-sm text-green-600 font-dm-sans">
                      -{formatAmount(Number(order.discountAmount || 0), order.currency)}
                      <span className="text-xs ml-1">({order.discountCode})</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 font-dm-sans">Método de pago</p>
                  <p className="font-medium text-gray-900 font-dm-sans flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-dm-sans">Moneda</p>
                  <p className="font-medium text-gray-900 font-dm-sans">{order.currency}</p>
                </div>
                {order.providerTransactionId && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 font-dm-sans">ID Transacción</p>
                    <p className="font-mono text-sm text-gray-900">{order.providerTransactionId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Info (if exists) */}
          {order.booking && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-gazeta text-xl text-[#654177] mb-4">Sesión asociada</h2>
              <div className="flex items-center gap-4 p-4 bg-[#f8f0f5]/50 rounded-lg">
                <Calendar className="w-5 h-5 text-[#8A4BAF]" />
                <div>
                  <p className="font-medium text-[#654177] font-dm-sans">{order.booking.resourceName}</p>
                  {order.booking.scheduledAt && (
                    <p className="text-sm text-gray-500 font-dm-sans">
                      {formatDate(order.booking.scheduledAt)}
                    </p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    order.booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    order.booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    order.booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.booking.status}
                  </span>
                </div>
                <Link
                  href={`/admin/bookings?id=${order.booking.id}`}
                  className="ml-auto text-sm text-[#8A4BAF] hover:underline font-dm-sans"
                >
                  Ver sesión
                </Link>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {auditLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-gazeta text-xl text-[#654177] mb-4">Historial de acciones</h2>
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-[#8A4BAF] rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900 font-dm-sans">
                        {log.action} por {log.actorEmail}
                      </p>
                      {log.reason && (
                        <p className="text-gray-500 font-dm-sans">Motivo: {log.reason}</p>
                      )}
                      <p className="text-xs text-gray-400 font-dm-sans">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-lg text-[#654177] mb-4">Cliente</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-dm-sans">
                  {order.user?.name || order.guestName || 'Sin nombre'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-dm-sans">
                  {order.user?.email || order.guestEmail || 'Sin email'}
                </span>
              </div>
              {(order.user?.country) && (
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 text-center">🌍</span>
                  <span className="text-sm font-dm-sans">{order.user.country}</span>
                </div>
              )}
              {order.user?.id && (
                <Link
                  href={`/admin/users/${order.user.id}`}
                  className="block mt-4 text-sm text-[#8A4BAF] hover:underline font-dm-sans"
                >
                  Ver perfil completo →
                </Link>
              )}
            </div>
          </div>

          {/* Email History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-lg text-[#654177] mb-4">Emails enviados</h2>
            {emailLogs.length > 0 ? (
              <div className="space-y-3">
                {emailLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 font-dm-sans">
                        {log.template}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'SENT' ? 'bg-green-100 text-green-700' :
                        log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-dm-sans mt-1">
                      {log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-dm-sans">No hay emails registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
