import { NextRequest, NextResponse } from 'next/server'
import { generateWompiIntegritySignature } from '@/lib/wompi'

/**
 * POST /api/checkout/wompi/signature
 * Genera la firma de integridad para el Widget de Wompi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference, amountInCents, currency = 'COP' } = body

    if (!reference || !amountInCents) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const signature = generateWompiIntegritySignature(
      reference,
      amountInCents,
      currency
    )

    return NextResponse.json({ signature })
  } catch (error) {
    console.error('Error generating Wompi signature:', error)
    return NextResponse.json(
      { error: 'Error generando firma' },
      { status: 500 }
    )
  }
}
