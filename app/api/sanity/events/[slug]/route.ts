import { NextRequest, NextResponse } from 'next/server'
import { getEventBySlug } from '@/lib/sanity/queries/events'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const event = await getEventBySlug(slug)

    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Error al obtener el evento' },
      { status: 500 }
    )
  }
}
