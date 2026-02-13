import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getCreditsHistory } from '@/lib/credits'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const history = await getCreditsHistory(session.user.id, Math.min(limit, 100))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('[API/credits/history] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
