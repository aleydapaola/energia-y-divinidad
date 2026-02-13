import { ArrowLeft } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getEventPerkStats, getEventAllocations } from '@/lib/events/perks'
import { prisma } from '@/lib/prisma'
import { getEventById } from '@/lib/sanity/queries/events'

import { AdminPerksManager } from './AdminPerksManager'

import type { EventPerk } from '@/types/events'

export const metadata: Metadata = {
  title: 'Gestionar Perks | Admin',
  robots: 'noindex, nofollow',
}

interface Props {
  params: Promise<{ eventId: string }>
}

export default async function AdminEventPerksPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    notFound()
  }

  const { eventId } = await params
  const event = await getEventById(eventId)

  if (!event) {
    notFound()
  }

  // Get initial data
  const [stats, allocations] = await Promise.all([
    getEventPerkStats(eventId),
    getEventAllocations(eventId),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#8A4BAF] mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Eventos
          </Link>
          <h1 className="font-gazeta text-3xl text-[#654177]">
            Perks: {event.title}
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona la entrega de perks a los asistentes
          </p>
        </div>
      </div>

      <AdminPerksManager
        eventId={eventId}
        eventTitle={event.title}
        perks={(event.perks as EventPerk[]) || []}
        initialStats={stats}
        initialAllocations={allocations}
      />
    </div>
  )
}
