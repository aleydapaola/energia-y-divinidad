import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getMembershipStatus } from '@/lib/membership-access'
import { getMembershipTierById } from '@/lib/sanity/queries/membership'

/**
 * GET /api/membership/status
 * Obtiene el estado de la membresía del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const status = await getMembershipStatus(session.user.id)

    // Si tiene membresía activa, obtener los datos del tier desde Sanity
    if (status.subscription) {
      const tier = await getMembershipTierById(status.subscription.membershipTierId)
      status.tier = tier
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting membership status:', error)
    return NextResponse.json({ error: 'Error al obtener estado de membresía' }, { status: 500 })
  }
}
