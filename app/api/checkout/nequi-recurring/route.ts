import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createNequiSubscription,
  validateColombianPhoneNumber,
} from '@/lib/nequi'
import { prisma } from '@/lib/prisma'

interface CheckoutBody {
  membershipTierId: string
  membershipTierName: string
  billingInterval: 'monthly' | 'yearly'
  amount: number // en COP (ej: 150000)
  currency: 'COP'
  phoneNumber: string // número de celular colombiano
}

/**
 * POST /api/checkout/nequi-recurring
 * Crear suscripción de débito automático con Nequi
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body: CheckoutBody = await request.json()
    const {
      membershipTierId,
      membershipTierName,
      billingInterval,
      amount,
      currency,
      phoneNumber,
    } = body

    // Validaciones
    if (!membershipTierId || !membershipTierName || !billingInterval || !amount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    if (currency !== 'COP') {
      return NextResponse.json(
        { error: 'Nequi solo acepta pagos en COP' },
        { status: 400 }
      )
    }

    if (billingInterval !== 'monthly' && billingInterval !== 'yearly') {
      return NextResponse.json(
        { error: 'Intervalo de facturación inválido' },
        { status: 400 }
      )
    }

    // Validar número de celular colombiano
    if (!validateColombianPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Número de celular inválido. Debe ser un número colombiano de 10 dígitos comenzando con 3' },
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

    // Crear suscripción en Nequi API
    let nequiResponse
    try {
      nequiResponse = await createNequiSubscription(
        phoneNumber,
        amount,
        billingInterval,
        {
          userId: session.user.id,
          tierId: membershipTierId,
          tierName: membershipTierName,
        }
      )
    } catch (error: any) {
      console.error('Error creando suscripción en Nequi:', error)
      return NextResponse.json(
        {
          error: 'Error al crear la suscripción con Nequi. Por favor intenta nuevamente.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    // Calcular período de validez
    const now = new Date()
    const periodEnd = new Date()
    if (billingInterval === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    // Crear suscripción en DB con estado TRIAL (mientras espera aprobación)
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        membershipTierId,
        membershipTierName,
        status: 'TRIAL', // Cambiará a ACTIVE cuando el usuario apruebe
        paymentProvider: 'nequi',
        billingInterval: billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
        amount,
        currency: 'COP',
        nequiSubscriptionId: nequiResponse.subscriptionId,
        nequiPhoneNumber: phoneNumber,
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      nequiSubscriptionId: nequiResponse.subscriptionId,
      status: 'pending',
      message: 'Por favor aprueba la suscripción en tu app Nequi',
      instructions: [
        'Abre tu aplicación Nequi',
        'Ve a la sección de Notificaciones',
        'Busca la solicitud de débito automático',
        'Aprueba la suscripción a Energía y Divinidad',
      ],
    })
  } catch (error: any) {
    console.error('Error en checkout de Nequi:', error)
    return NextResponse.json(
      { error: 'Error al procesar el checkout' },
      { status: 500 }
    )
  }
}
