import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email: 'xmonfau@gmail.com' },
    select: { id: true, email: true, name: true }
  })
  
  if (!user) {
    console.log('Usuario no encontrado')
    return
  }
  
  console.log('Usuario encontrado:', user)
  
  // Contar registros antes de eliminar
  const ordersCount = await prisma.order.count({ where: { userId: user.id } })
  const bookingsCount = await prisma.booking.count({ where: { userId: user.id } })
  const subscriptionsCount = await prisma.subscription.count({ where: { userId: user.id } })
  const entitlementsCount = await prisma.entitlement.count({ where: { userId: user.id } })
  const packCodesCount = await prisma.sessionPackCode.count({ where: { userId: user.id } })
  
  console.log('\nRegistros a eliminar:')
  console.log('- Orders:', ordersCount)
  console.log('- Bookings:', bookingsCount)
  console.log('- Subscriptions:', subscriptionsCount)
  console.log('- Entitlements:', entitlementsCount)
  console.log('- SessionPackCodes:', packCodesCount)
  
  // Eliminar en orden (respetando foreign keys)
  console.log('\nEliminando...')
  
  // 1. Eliminar bookings
  const deletedBookings = await prisma.booking.deleteMany({ where: { userId: user.id } })
  console.log('Bookings eliminados:', deletedBookings.count)
  
  // 2. Eliminar entitlements
  const deletedEntitlements = await prisma.entitlement.deleteMany({ where: { userId: user.id } })
  console.log('Entitlements eliminados:', deletedEntitlements.count)
  
  // 3. Eliminar pack codes
  const deletedPackCodes = await prisma.sessionPackCode.deleteMany({ where: { userId: user.id } })
  console.log('SessionPackCodes eliminados:', deletedPackCodes.count)
  
  // 4. Eliminar subscriptions
  const deletedSubscriptions = await prisma.subscription.deleteMany({ where: { userId: user.id } })
  console.log('Subscriptions eliminados:', deletedSubscriptions.count)

  // 4.5 Eliminar manual payments asociados a las órdenes del usuario
  const userOrders = await prisma.order.findMany({ where: { userId: user.id }, select: { id: true } })
  const orderIds = userOrders.map(o => o.id)
  if (orderIds.length > 0) {
    const deletedManualPayments = await prisma.manualPayment.deleteMany({ where: { orderId: { in: orderIds } } })
    console.log('ManualPayments eliminados:', deletedManualPayments.count)
  }

  // 5. Eliminar orders
  const deletedOrders = await prisma.order.deleteMany({ where: { userId: user.id } })
  console.log('Orders eliminados:', deletedOrders.count)
  
  // También eliminar órdenes de guest checkout con ese email
  const deletedGuestOrders = await prisma.order.deleteMany({ where: { guestEmail: 'xmonfau@gmail.com' } })
  console.log('Guest Orders eliminados:', deletedGuestOrders.count)
  
  console.log('\n✅ Todos los datos de compra han sido eliminados para el usuario xmonfau@gmail.com')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
