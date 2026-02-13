import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getCreditsBalance } from '@/lib/credits'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
    }

    const balance = await getCreditsBalance(session.user.id)

    return NextResponse.json({ balance })
  } catch (error) {
    console.error('[API/credits/balance] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
