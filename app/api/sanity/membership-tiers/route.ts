import { NextResponse } from 'next/server'

import { getAllMembershipTiers } from '@/lib/sanity/queries/membership'

/**
 * GET /api/sanity/membership-tiers
 * Obtener todos los tiers de membresía activos desde Sanity
 */
export async function GET() {
  try {
    const tiers = await getAllMembershipTiers()
    return NextResponse.json(tiers)
  } catch (error) {
    console.error('Error fetching membership tiers:', error)
    return NextResponse.json(
      { error: 'Error al obtener planes de membresía' },
      { status: 500 }
    )
  }
}
