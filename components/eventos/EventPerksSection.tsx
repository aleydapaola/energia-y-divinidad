'use client'

import {
  CheckCircle,
  Users,
  Star,
  Download,
  Clock,
  Video,
  FileText,
  BookOpen,
  Sparkles,
  MessageCircle,
  HelpCircle,
} from 'lucide-react'

import type { EventPerk, PerkType } from '@/types/events'

interface EventPerksSectionProps {
  perks: EventPerk[]
}

const perkTypeConfig: Record<
  PerkType,
  { label: string; icon: React.ReactNode }
> = {
  recording: { label: 'Grabación', icon: <Video className="w-4 h-4" /> },
  transcript: { label: 'Transcripción', icon: <FileText className="w-4 h-4" /> },
  workbook: { label: 'Workbook', icon: <BookOpen className="w-4 h-4" /> },
  bonus_meditation: {
    label: 'Meditación Bonus',
    icon: <Sparkles className="w-4 h-4" />,
  },
  personal_message: {
    label: 'Mensaje Personal',
    icon: <MessageCircle className="w-4 h-4" />,
  },
  priority_qa: { label: 'Q&A Prioritario', icon: <HelpCircle className="w-4 h-4" /> },
}

export function EventPerksSection({ perks }: EventPerksSectionProps) {
  if (!perks || perks.length === 0) {return null}

  return (
    <section className="py-12 bg-[#f8f0f5]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="font-gazeta text-2xl text-[#8A4BAF] mb-6 flex items-center gap-2">
            <Download className="w-6 h-6" />
            Incluye
          </h3>
          <div className="grid gap-4">
            {perks.map((perk, index) => {
              const config = perkTypeConfig[perk.type] || {
                label: perk.type,
                icon: <CheckCircle className="w-4 h-4" />,
              }

              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-4"
                >
                  <div className="p-2 bg-[#8A4BAF]/10 rounded-lg text-[#8A4BAF] flex-shrink-0">
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{perk.title}</h4>
                      {perk.cap && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          <Users className="w-3 h-3" />
                          {perk.cap} cupos
                        </span>
                      )}
                      {perk.priorityPlans && perk.priorityPlans.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          <Star className="w-3 h-3" />
                          Garantizado para{' '}
                          {perk.priorityPlans.map((p) => p.name).join(', ')}
                        </span>
                      )}
                      {perk.deliveryMode === 'post_event' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Post-evento
                        </span>
                      )}
                    </div>
                    {perk.description && (
                      <p className="text-sm text-gray-600 mt-1">{perk.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
