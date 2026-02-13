import { prisma } from "@/lib/prisma"

import { AdminUsersList } from "./AdminUsersList"

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          bookings: true,
          subscriptions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Get active subscriptions for each user
  const userIds = users.map((u) => u.id)
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      userId: { in: userIds },
      status: 'ACTIVE',
    },
    select: {
      userId: true,
      membershipTierName: true,
    },
  })

  const subscriptionMap = new Map(
    activeSubscriptions.map((s) => [s.userId, s.membershipTierName])
  )

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    ordersCount: u._count.orders,
    bookingsCount: u._count.bookings,
    subscriptionsCount: u._count.subscriptions,
    activeMembership: subscriptionMap.get(u.id) || null,
  }))

  // Calculate stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    withMembership: activeSubscriptions.length,
    recentSignups: users.filter((u) => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return u.createdAt >= sevenDaysAgo
    }).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Usuarios</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra los usuarios registrados y sus roles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Total Usuarios</p>
          <p className="text-2xl font-semibold text-[#654177]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Administradores</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.admins}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Con Membresía Activa</p>
          <p className="text-2xl font-semibold text-green-600">{stats.withMembership}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Nuevos (7 días)</p>
          <p className="text-2xl font-semibold text-[#8A4BAF]">{stats.recentSignups}</p>
        </div>
      </div>

      <AdminUsersList initialUsers={serializedUsers} />
    </div>
  )
}
