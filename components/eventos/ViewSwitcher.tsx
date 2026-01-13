'use client'

import { List, Calendar, CalendarDays, CalendarClock, Image } from 'lucide-react'

export type ViewType = 'list' | 'month' | 'week' | 'day' | 'photo'

interface ViewSwitcherProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

const views: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'list', label: 'Lista', icon: <List className="w-4 h-4" /> },
  { id: 'month', label: 'Mes', icon: <Calendar className="w-4 h-4" /> },
  { id: 'week', label: 'Semana', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'day', label: 'Día', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'photo', label: 'Fotos', icon: <Image className="w-4 h-4" /> },
]

export default function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${currentView === view.id
              ? 'bg-[#4944a4] text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }
          `}
          aria-label={`Vista de ${view.label}`}
        >
          {view.icon}
          <span className="hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  )
}
