import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurado')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

/**
 * Helper: Obtener o crear un Stripe Price para un tier de membresía
 *
 * Busca un precio existente en Stripe con metadata que coincida con el tier.
 * Si no existe, crea un nuevo Price.
 *
 * @param tierId - ID del tier en Sanity
 * @param tierName - Nombre del tier
 * @param amount - Monto en centavos (ej: 2999 para $29.99)
 * @param currency - Moneda (solo 'usd' para Stripe)
 * @param interval - Intervalo de facturación ('month' | 'year')
 * @returns Stripe Price object
 */
export async function getOrCreateStripePrice(
  tierId: string,
  tierName: string,
  amount: number,
  currency: 'usd',
  interval: 'month' | 'year'
): Promise<Stripe.Price> {
  // Buscar precio existente con metadata
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
    currency,
    limit: 100,
  })

  const existingPrice = prices.data.find(
    (price) =>
      price.metadata.tierId === tierId &&
      price.metadata.interval === interval &&
      price.unit_amount === amount &&
      price.recurring?.interval === interval
  )

  if (existingPrice) {
    return existingPrice
  }

  // Crear nuevo precio si no existe
  const product = await getOrCreateStripeProduct(tierName, tierId)

  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency,
    recurring: {
      interval,
      interval_count: 1,
    },
    metadata: {
      tierId,
      tierName,
      interval,
    },
  })

  return newPrice
}

/**
 * Helper: Obtener o crear un Stripe Product para un tier
 */
async function getOrCreateStripeProduct(
  tierName: string,
  tierId: string
): Promise<Stripe.Product> {
  // Buscar producto existente
  const products = await stripe.products.list({
    active: true,
    limit: 100,
  })

  const existingProduct = products.data.find(
    (product) => product.metadata.tierId === tierId
  )

  if (existingProduct) {
    return existingProduct
  }

  // Crear nuevo producto
  const newProduct = await stripe.products.create({
    name: `Membresía ${tierName}`,
    description: `Membresía de Energía y Divinidad - Nivel ${tierName}`,
    metadata: {
      tierId,
      tierName,
    },
  })

  return newProduct
}

/**
 * Helper: Obtener o crear un Stripe Customer para un usuario
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Buscar customer existente por metadata
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  const existingCustomer = customers.data.find(
    (customer) => customer.metadata.userId === userId
  )

  if (existingCustomer) {
    return existingCustomer
  }

  // Crear nuevo customer
  const newCustomer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })

  return newCustomer
}

/**
 * Helper: Cancelar una suscripción de Stripe
 * @param subscriptionId - ID de la suscripción en Stripe
 * @param immediately - Si true, cancela inmediatamente. Si false, cancela al final del período
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId)
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  }
}

/**
 * Helper: Reactivar una suscripción de Stripe que está marcada para cancelación
 */
export async function reactivateStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Helper: Cambiar el plan de una suscripción
 * Stripe maneja automáticamente la proration
 */
export async function changeStripeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
}
