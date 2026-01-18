import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Clock,
  Shield,
  ShoppingBag,
  CreditCard,
  CalendarCheck,
} from "lucide-react"

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          orders: true,
          bookings: true,
          subscriptions: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // Get active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      membershipTierName: true,
      status: true,
      billingInterval: true,
      amount: true,
      currency: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
    },
  })

  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      createdAt: true,
    },
  })

  // Get recent bookings
  const recentBookings = await prisma.booking.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      resourceName: true,
      bookingType: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
    },
  })

  // Get audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'user',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
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

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-blue-100 text-blue-700',
      USER: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      USER: 'Usuario',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
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

  const getBookingStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      NO_SHOW: 'bg-red-100 text-red-700',
    }
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getOrderTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      SESSION: 'bg-violet-100 text-violet-700',
      MEMBERSHIP: 'bg-indigo-100 text-indigo-700',
      EVENT: 'bg-pink-100 text-pink-700',
      PRODUCT: 'bg-teal-100 text-teal-700',
    }
    const labels: Record<string, string> = {
      SESSION: 'Sesión',
      MEMBERSHIP: 'Membresía',
      EVENT: 'Evento',
      PRODUCT: 'Producto',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    )
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      role_change: 'Cambio de rol',
      create: 'Creación',
      update: 'Actualización',
    }
    return labels[action] || action
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'Usuario'}
              width={56}
              height={56}
              className="rounded-full"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#f8f0f5] flex items-center justify-center">
              <User className="w-7 h-7 text-[#8A4BAF]" />
            </div>
          )}
          <div>
            <h1 className="font-gazeta text-3xl text-[#654177]">
              {user.name || 'Sin nombre'}
            </h1>
            <p className="text-gray-600 font-dm-sans mt-1">
              {user.email}
            </p>
          </div>
        </div>
        {getRoleBadge(user.role)}
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
                  {user.name || 'Sin nombre'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Email</p>
                <p className="font-medium text-gray-900 font-dm-sans flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Email Verificado</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {user.emailVerified ? formatDateTime(user.emailVerified) : 'No verificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">ID de Usuario</p>
                <p className="font-mono text-sm text-gray-900">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Fecha de Registro</p>
                <p className="font-medium text-gray-900 font-dm-sans flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(user.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-dm-sans">Última Actualización</p>
                <p className="font-medium text-gray-900 font-dm-sans">
                  {formatDateTime(user.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#f8f0f5] rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-[#8A4BAF]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{user._count.orders}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">Órdenes</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eef1fa] rounded-lg">
                  <CalendarCheck className="w-5 h-5 text-[#2D4CC7]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{user._count.bookings}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">Sesiones</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{user._count.subscriptions}</p>
                  <p className="text-sm text-gray-500 font-dm-sans">Suscripciones</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Subscription */}
          {activeSubscription && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                Membresía Activa
              </h2>
              <div className="p-4 bg-gradient-to-r from-[#f8f0f5] to-[#eef1fa] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-[#654177] font-dm-sans">
                    {activeSubscription.membershipTierName}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Activa
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-dm-sans">Monto</p>
                    <p className="font-medium text-gray-900 font-dm-sans">
                      {formatAmount(Number(activeSubscription.amount), activeSubscription.currency)}
                      {activeSubscription.billingInterval === 'MONTHLY' ? '/mes' : '/año'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-dm-sans">Período Actual</p>
                    <p className="font-medium text-gray-900 font-dm-sans">
                      {formatDate(activeSubscription.currentPeriodStart)} - {formatDate(activeSubscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/subscriptions/${activeSubscription.id}`}
                  className="mt-3 inline-block text-sm text-[#8A4BAF] hover:underline font-dm-sans"
                >
                  Ver detalles de la suscripción
                </Link>
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5" />
              Últimas Órdenes
            </h2>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-[#f8f0f5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#654177] font-dm-sans">
                          {order.orderNumber}
                        </span>
                        {getOrderTypeBadge(order.orderType)}
                      </div>
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-900 font-dm-sans">
                        {formatAmount(Number(order.amount), order.currency)}
                      </p>
                      <p className="text-xs text-gray-500 font-dm-sans">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-dm-sans">
                No hay órdenes registradas.
              </p>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <CalendarCheck className="w-5 h-5" />
              Últimas Sesiones
            </h2>
            {recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-[#f8f0f5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 font-dm-sans">
                        {booking.resourceName}
                      </span>
                      {getBookingStatusBadge(booking.status)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-600 font-dm-sans">
                        {booking.scheduledAt
                          ? `Agendada: ${formatDateTime(booking.scheduledAt)}`
                          : 'Sin agendar'}
                      </p>
                      <p className="text-xs text-gray-500 font-dm-sans">
                        Creada: {formatDateTime(booking.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-dm-sans">
                No hay sesiones registradas.
              </p>
            )}
          </div>
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
        </div>
      </div>
    </div>
  )
}
