import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe, getOrCreateStripePrice, getOrCreateStripeCustomer } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

interface CheckoutBody {
  membershipTierId: string
  membershipTierName: string
  billingInterval: 'monthly' | 'yearly'
  amount: number // en USD (ej: 29.99)
  currency: 'USD'
}

/**
 * POST /api/checkout/stripe
 * Crear sesión de Stripe Checkout para suscripción recurrente
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: CheckoutBody = await request.json()
    const { membershipTierId, membershipTierName, billingInterval, amount, currency } = body

    // Validaciones
    if (!membershipTierId || !membershipTierName || !billingInterval || !amount) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    if (billingInterval !== 'monthly' && billingInterval !== 'yearly') {
      return NextResponse.json(
        { error: 'Intervalo de facturación inválido' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya tiene una suscripción activa
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['ACTIVE', 'TRIAL', 'PAST_DUE'],
        },
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Ya tienes una suscripción activa. Por favor cancela la actual antes de crear una nueva.' },
        { status: 400 }
      )
    }

    // Convertir a centavos para Stripe
    const amountInCents = Math.round(amount * 100)

    // Obtener o crear Stripe Customer
    const customer = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name || undefined
    )

    // Obtener o crear Stripe Price
    const interval = billingInterval === 'monthly' ? 'month' : 'year'
    const price = await getOrCreateStripePrice(
      membershipTierId,
      membershipTierName,
      amountInCents,
      'usd',
      interval
    )

    // Crear sesión de Checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/membresia`,
      metadata: {
        userId: session.user.id,
        membershipTierId,
        membershipTierName,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          membershipTierId,
          membershipTierName,
          billingInterval,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error)
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    )
  }
}
