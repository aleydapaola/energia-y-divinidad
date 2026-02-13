import { prisma } from "@/lib/prisma"

import { AdminSubscriptionsList } from "./AdminSubscriptionsList"

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serializedSubscriptions = subscriptions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    membershipTierName: s.membershipTierName,
    membershipTierId: s.membershipTierId,
    status: s.status,
    billingInterval: s.billingInterval,
    amount: Number(s.amount),
    currency: s.currency,
    paymentProvider: s.paymentProvider,
    currentPeriodStart: s.currentPeriodStart.toISOString(),
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    cancelledAt: s.cancelledAt?.toISOString() || null,
    createdAt: s.createdAt.toISOString(),
  }))

  // Calculate stats
  const stats = {
    active: subscriptions.filter((s) => s.status === 'ACTIVE').length,
    cancelled: subscriptions.filter((s) => s.status === 'CANCELLED').length,
    pastDue: subscriptions.filter((s) => s.status === 'PAST_DUE').length,
    totalMRR: {
      COP: subscriptions
        .filter((s) => s.currency === 'COP' && s.status === 'ACTIVE' && s.billingInterval === 'MONTHLY')
        .reduce((sum, s) => sum + Number(s.amount), 0),
      USD: subscriptions
        .filter((s) => s.currency === 'USD' && s.status === 'ACTIVE' && s.billingInterval === 'MONTHLY')
        .reduce((sum, s) => sum + Number(s.amount), 0),
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Membresías</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra las suscripciones y membresías activas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Activas</p>
          <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Canceladas</p>
          <p className="text-2xl font-semibold text-gray-600">{stats.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">Con Mora</p>
          <p className="text-2xl font-semibold text-red-600">{stats.pastDue}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 font-dm-sans">MRR (Ingresos Mensuales)</p>
          <div className="flex flex-col">
            {stats.totalMRR.COP > 0 && (
              <p className="text-lg font-semibold text-[#654177]">
                ${stats.totalMRR.COP.toLocaleString('es-CO')} COP
              </p>
            )}
            {stats.totalMRR.USD > 0 && (
              <p className="text-lg font-semibold text-[#654177]">
                ${stats.totalMRR.USD.toFixed(2)} USD
              </p>
            )}
            {stats.totalMRR.COP === 0 && stats.totalMRR.USD === 0 && (
              <p className="text-lg font-semibold text-gray-400">$0</p>
            )}
          </div>
        </div>
      </div>

      <AdminSubscriptionsList initialSubscriptions={serializedSubscriptions} />
    </div>
  )
}
