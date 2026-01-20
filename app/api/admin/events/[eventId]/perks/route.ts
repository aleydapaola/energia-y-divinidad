import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getEventPerkStats,
  getEventAllocations,
  deliverPerk,
  bulkDeliverPerks,
} from '@/lib/events/perks'
import { PerkAllocationStatus } from '@prisma/client'

/**
 * Check if user is admin
 */
async function requireAdmin(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  return user?.role === 'ADMIN' ? session.user.id : null
}

/**
 * GET /api/admin/events/[eventId]/perks
 * Get perk stats and allocations for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const perkType = searchParams.get('perkType') || undefined
    const status = searchParams.get('status') as PerkAllocationStatus | undefined

    // Get stats
    const stats = await getEventPerkStats(eventId)

    // Get allocations with filters
    const allocations = await getEventAllocations(eventId, { perkType, status })

    return NextResponse.json({ stats, allocations })
  } catch (error) {
    console.error('Error fetching event perks:', error)
    return NextResponse.json(
      { error: 'Error al obtener los perks' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/events/[eventId]/perks
 * Deliver a perk (single or bulk)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { eventId } = await params
    const body = await request.json()
    const { action, allocationId, perkType, assetUrl } = body

    if (action === 'deliver_single' && allocationId) {
      await deliverPerk({
        allocationId,
        assetUrl,
        adminUserId: adminId,
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'deliver_bulk' && perkType && assetUrl) {
      const result = await bulkDeliverPerks({
        eventId,
        perkType,
        assetUrl,
        adminUserId: adminId,
      })
      return NextResponse.json({ success: true, updated: result.updated })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error delivering perk:', error)
    return NextResponse.json(
      { error: error.message || 'Error al entregar el perk' },
      { status: 500 }
    )
  }
}
