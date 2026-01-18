import { prisma } from '@/lib/prisma'

// ============================================
// Estadísticas de Ventas
// ============================================

interface SalesStats {
  today: {
    COP: number
    USD: number
    count: number
  }
  week: {
    COP: number
    USD: number
    count: number
  }
}

/**
 * Obtiene estadísticas de ventas para el día actual y los últimos N días
 */
export async function getSalesStats(days: number = 7): Promise<SalesStats> {
  const now = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  from.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from },
      paymentStatus: 'COMPLETED',
    },
    select: {
      amount: true,
      currency: true,
      createdAt: true,
    },
  })

  const stats: SalesStats = {
    today: { COP: 0, USD: 0, count: 0 },
    week: { COP: 0, USD: 0, count: 0 },
  }

  for (const order of orders) {
    const amount = Number(order.amount)
    const currency = order.currency as 'COP' | 'USD'
    const isToday = order.createdAt >= today

    // Acumular en semana
    if (currency === 'COP' || currency === 'USD') {
      stats.week[currency] += amount
    }
    stats.week.count++

    // Acumular en hoy
    if (isToday) {
      if (currency === 'COP' || currency === 'USD') {
        stats.today[currency] += amount
      }
      stats.today.count++
    }
  }

  return stats
}

// ============================================
// Alertas del Dashboard
// ============================================

interface DashboardAlerts {
  failedPayments: number
  recentCancellations: number
  pendingBookings: number
  lowStockEvents: Array<{
    id: string
    name: string
    available: number
  }>
}

/**
 * Obtiene alertas para el dashboard de admin
 */
export async function getAlerts(): Promise<DashboardAlerts> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const [failedPayments, recentCancellations, pendingBookings] = await Promise.all([
    // Pagos fallidos en las últimas 24h
    prisma.order.count({
      where: {
        paymentStatus: 'FAILED',
        createdAt: { gte: yesterday },
      },
    }),
    // Cancelaciones recientes
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: { gte: yesterday },
      },
    }),
    // Bookings pendientes de confirmación
    prisma.booking.count({
      where: {
        status: 'PENDING',
      },
    }),
  ])

  return {
    failedPayments,
    recentCancellations,
    pendingBookings,
    lowStockEvents: [], // TODO: Implementar cuando tengamos eventos con cupos en Sanity
  }
}

// ============================================
// Estadísticas de Bookings
// ============================================

interface BookingStats {
  total: number
  upcoming: number
  pending: number
  completedThisMonth: number
  cancelledThisMonth: number
}

/**
 * Obtiene estadísticas de bookings/sesiones
 */
export async function getBookingStats(): Promise<BookingStats> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, upcoming, pending, completedThisMonth, cancelledThisMonth] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({
      where: {
        scheduledAt: { gte: now },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
    prisma.booking.count({
      where: { status: 'PENDING' },
    }),
    prisma.booking.count({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: startOfMonth },
      },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: { gte: startOfMonth },
      },
    }),
  ])

  return {
    total,
    upcoming,
    pending,
    completedThisMonth,
    cancelledThisMonth,
  }
}

// ============================================
// Estadísticas de Usuarios y Suscripciones
// ============================================

interface UserStats {
  totalUsers: number
  newUsersThisMonth: number
  activeSubscriptions: number
  cancelledSubscriptionsThisMonth: number
}

/**
 * Obtiene estadísticas de usuarios y suscripciones
 */
export async function getUserStats(): Promise<UserStats> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalUsers, newUsersThisMonth, activeSubscriptions, cancelledSubscriptionsThisMonth] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.subscription.count({
        where: {
          status: 'CANCELLED',
          cancelledAt: { gte: startOfMonth },
        },
      }),
    ])

  return {
    totalUsers,
    newUsersThisMonth,
    activeSubscriptions,
    cancelledSubscriptionsThisMonth,
  }
}

// ============================================
// Próximas Sesiones
// ============================================

interface UpcomingSession {
  id: string
  userName: string | null
  userEmail: string
  resourceName: string
  scheduledAt: Date
  status: string
}

/**
 * Obtiene las próximas sesiones programadas
 */
export async function getUpcomingSessions(limit: number = 5): Promise<UpcomingSession[]> {
  const now = new Date()
  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
  twoDaysFromNow.setHours(0, 0, 0, 0)

  const sessions = await prisma.booking.findMany({
    where: {
      scheduledAt: {
        gte: now,
        lt: twoDaysFromNow,
      },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  })

  return sessions.map((s) => ({
    id: s.id,
    userName: s.user.name,
    userEmail: s.user.email,
    resourceName: s.resourceName,
    scheduledAt: s.scheduledAt!,
    status: s.status,
  }))
}

// ============================================
// Resumen completo del Dashboard
// ============================================

export interface DashboardSummary {
  sales: SalesStats
  alerts: DashboardAlerts
  bookings: BookingStats
  users: UserStats
  upcomingSessions: UpcomingSession[]
}

/**
 * Obtiene todos los datos necesarios para el dashboard de admin
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [sales, alerts, bookings, users, upcomingSessions] = await Promise.all([
    getSalesStats(7),
    getAlerts(),
    getBookingStats(),
    getUserStats(),
    getUpcomingSessions(5),
  ])

  return {
    sales,
    alerts,
    bookings,
    users,
    upcomingSessions,
  }
}
