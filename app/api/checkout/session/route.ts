import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getSessionConfig } from '@/lib/sanity/queries/sessionConfig'
import { getNequiMode, generateTransactionCode } from '@/lib/nequi'

interface CheckoutBody {
  sessionType: 'single' | 'pack'
  date?: string // ISO date string for single session
  time?: string // Time slot for single session
  paymentMethod: 'nequi' | 'stripe' | 'paypal'
  region: 'colombia' | 'international'
}

// Default pack prices (7 sesiones, 1 gratis)
const PACK_MULTIPLIER = 7

/**
 * POST /api/checkout/session
 * Create checkout session for individual sessions or session packs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: CheckoutBody = await request.json()
    const { sessionType, date, time, paymentMethod, region } = body

    // Validations
    if (!sessionType || !paymentMethod || !region) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    if (sessionType === 'single' && (!date || !time)) {
      return NextResponse.json(
        { error: 'Fecha y hora son requeridos para sesión individual' },
        { status: 400 }
      )
    }

    // Validate payment method matches region
    if (region === 'colombia' && paymentMethod !== 'nequi') {
      return NextResponse.json(
        { error: 'Colombia solo acepta pagos por Nequi' },
        { status: 400 }
      )
    }

    if (region === 'international' && paymentMethod === 'nequi') {
      return NextResponse.json(
        { error: 'Nequi solo está disponible para Colombia' },
        { status: 400 }
      )
    }

    // Get session config from Sanity (prices, duration, etc.)
    const sessionConfig = await getSessionConfig()

    if (!sessionConfig) {
      return NextResponse.json(
        { error: 'Configuración de sesión no encontrada' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Get prices from Sanity
    const singlePriceCOP = sessionConfig.price || 303198
    const singlePriceUSD = sessionConfig.priceUSD || 70
    const packPriceCOP = singlePriceCOP * PACK_MULTIPLIER
    const packPriceUSD = singlePriceUSD * PACK_MULTIPLIER

    const prices = sessionType === 'single'
      ? { COP: singlePriceCOP, USD: singlePriceUSD }
      : { COP: packPriceCOP, USD: packPriceUSD }

    const productName = sessionConfig.title || (
      sessionType === 'single'
        ? 'Sesión de Canalización'
        : 'Pack de 8 Sesiones (7+1 Gratis)'
    )

    // Handle different payment methods
    if (paymentMethod === 'stripe') {
      // Stripe checkout for international payments
      const customer = await getOrCreateStripeCustomer(
        session.user.id,
        session.user.email,
        session.user.name || undefined
      )

      const amountInCents = prices.USD * 100

      // Determine success URL based on session type
      const successUrl = sessionType === 'pack'
        ? `${appUrl}/checkout/pack-success?session_id={CHECKOUT_SESSION_ID}`
        : `${appUrl}/sesiones/confirmacion?session_id={CHECKOUT_SESSION_ID}&type=${sessionType}`

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: productName,
                description:
                  sessionType === 'single'
                    ? `Sesión programada para ${date} a las ${time}`
                    : '8 sesiones de canalización (pagas 7, obtienes 8). Válido por 1 año.',
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: `${appUrl}/sesiones`,
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email,
          userName: session.user.name || '',
          sessionType,
          date: date || '',
          time: time || '',
          productType: sessionType === 'pack' ? 'session_pack' : 'session',
        },
      })

      // Create pending booking in database
      await prisma.booking.create({
        data: {
          userId: session.user.id,
          bookingType: 'SESSION_1_ON_1',
          resourceId: 'session-flexible',
          resourceName: productName,
          scheduledAt: date ? new Date(`${date}T${time}:00`) : null,
          duration: sessionConfig.duration || 90,
          status: 'PENDING_PAYMENT',
          amount: prices.USD,
          currency: 'USD',
          paymentMethod: 'STRIPE',
          paymentStatus: 'PENDING',
          stripeSessionId: checkoutSession.id,
          sessionsTotal: sessionType === 'pack' ? 8 : 1,
          sessionsRemaining: sessionType === 'pack' ? 8 : 1,
        },
      })

      return NextResponse.json({
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
        paymentMethod: 'stripe',
      })
    }

    if (paymentMethod === 'nequi') {
      // Nequi payment for Colombia
      const nequiMode = getNequiMode()
      const transactionCode = generateTransactionCode()

      // Create pending booking in database
      const booking = await prisma.booking.create({
        data: {
          userId: session.user.id,
          bookingType: 'SESSION_1_ON_1',
          resourceId: 'session-flexible',
          resourceName: productName,
          scheduledAt: date ? new Date(`${date}T${time}:00`) : null,
          duration: sessionConfig.duration || 90,
          status: 'PENDING_PAYMENT',
          amount: prices.COP,
          currency: 'COP',
          paymentMethod: 'NEQUI',
          paymentStatus: 'PENDING',
          sessionsTotal: sessionType === 'pack' ? 8 : 1,
          sessionsRemaining: sessionType === 'pack' ? 8 : 1,
          nequiTransactionCode: transactionCode,
        },
      })

      // Mode "app": Manual payment - redirect to instructions page
      if (nequiMode === 'app') {
        return NextResponse.json({
          url: `${appUrl}/pago/nequi?booking_id=${booking.id}&amount=${prices.COP}&type=${sessionType}`,
          bookingId: booking.id,
          paymentMethod: 'nequi',
          nequiMode: 'app',
        })
      }

      // Mode "push": Automatic payment via Nequi Push Notification
      // Redirect to page where user enters their Nequi phone number
      // Then we send a push notification to their Nequi app
      return NextResponse.json({
        url: `${appUrl}/pago/nequi/push?booking_id=${booking.id}&amount=${prices.COP}&type=${sessionType}`,
        bookingId: booking.id,
        paymentMethod: 'nequi',
        nequiMode: 'push',
        transactionCode,
      })
    }

    if (paymentMethod === 'paypal') {
      // PayPal is not implemented yet
      return NextResponse.json(
        { error: 'PayPal no está disponible aún. Por favor usa tarjeta de crédito.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Método de pago no válido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error creating session checkout:', error)
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    )
  }
}
