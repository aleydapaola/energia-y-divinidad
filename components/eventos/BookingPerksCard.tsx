'use client'

import {
  Download,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Video,
  FileText,
  BookOpen,
  Sparkles,
  MessageCircle,
  HelpCircle,
} from 'lucide-react'
import type { BookingPerks, PerkType, PerkAllocationStatus } from '@/types/events'

interface BookingPerksCardProps {
  perks: BookingPerks
}

const perkTypeConfig: Record<PerkType, { icon: React.ReactNode }> = {
  recording: { icon: <Video className="w-4 h-4" /> },
  transcript: { icon: <FileText className="w-4 h-4" /> },
  workbook: { icon: <BookOpen className="w-4 h-4" /> },
  bonus_meditation: { icon: <Sparkles className="w-4 h-4" /> },
  personal_message: { icon: <MessageCircle className="w-4 h-4" /> },
  priority_qa: { icon: <HelpCircle className="w-4 h-4" /> },
}

const statusConfig: Record<
  PerkAllocationStatus,
  { icon: typeof Clock; label: string; className: string }
> = {
  PENDING: {
    icon: Clock,
    label: 'Pendiente de entrega',
    className: 'bg-amber-100 text-amber-700',
  },
  DELIVERED: {
    icon: CheckCircle,
    label: 'Disponible',
    className: 'bg-green-100 text-green-700',
  },
  UNAVAILABLE: {
    icon: XCircle,
    label: 'No disponible',
    className: 'bg-gray-100 text-gray-500',
  },
}

export function BookingPerksCard({ perks }: BookingPerksCardProps) {
  if (!perks || perks.allocations.length === 0) return null

  return (
    <div className="mt-4 p-4 bg-[#f8f0f5] rounded-lg">
      <h4 className="font-semibold text-[#654177] mb-3 flex items-center gap-2">
        <Download className="w-4 h-4" />
        Tus Perks
      </h4>
      <div className="space-y-2">
        {perks.allocations.map((allocation) => {
          const config = statusConfig[allocation.status]
          const perkConfig = perkTypeConfig[allocation.perkType]
          const StatusIcon = config.icon

          return (
            <div
              key={allocation.id}
              className="flex items-center justify-between bg-white rounded-lg p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-1.5 bg-[#8A4BAF]/10 rounded text-[#8A4BAF] flex-shrink-0">
                  {perkConfig?.icon || <Download className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-700 block truncate">
                    {allocation.perkTitle}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full mt-1 ${config.className}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </span>
                </div>
              </div>
              {allocation.status === 'DELIVERED' && allocation.assetUrl && (
                <a
                  href={allocation.assetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4944a4] hover:text-[#3d3a8a] flex items-center gap-1 text-sm font-medium flex-shrink-0 ml-2"
                >
                  Descargar
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
