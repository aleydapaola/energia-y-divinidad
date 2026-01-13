import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/sanity/client'

/**
 * GET /api/sanity/membership-tiers/[tierId]
 * Obtener un tier específico de membresía desde Sanity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  try {
    const { tierId } = await params
    const query = `*[_type == "membershipTier" && _id == $tierId][0]{
      _id,
      name,
      tagline,
      description,
      pricing,
      features,
      color,
      icon,
      popularityBadge,
      trialPeriod,
      ctaButtonText
    }`

    const tier = await client.fetch(query, { tierId })

    if (!tier) {
      return NextResponse.json({ error: 'Tier no encontrado' }, { status: 404 })
    }

    return NextResponse.json(tier)
  } catch (error) {
    console.error('Error fetching membership tier:', error)
    return NextResponse.json(
      { error: 'Error al obtener tier de membresía' },
      { status: 500 }
    )
  }
}
