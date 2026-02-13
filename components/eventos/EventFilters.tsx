'use client'

import {
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  X
} from 'lucide-react'
import { useState } from 'react'

export interface FilterState {
  keyword: string
  location: string
  categories: string[]
  tags: string[]
  venues: string[]
  daysOfWeek: number[]
  timeOfDay: string[]
  dateRange: {
    from: string
    to: string
  }
  priceRange: {
    min: number
    max: number
  }
  featuredOnly: boolean
  eventSeries: string[]
  showPastEvents: boolean
  hideCancelled: boolean
  virtualFilter: 'all' | 'only' | 'hide'
}

interface EventFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  // Opciones dinámicas extraídas de los eventos
  availableCategories: string[]
  availableTags: string[]
  availableVenues: string[]
  availableSeries: string[]
  maxPrice: number
}

interface FilterSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function FilterSection({ title, defaultOpen = false, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const TIME_OF_DAY = [
  { value: 'morning', label: 'Mañana (6am - 12pm)' },
  { value: 'afternoon', label: 'Tarde (12pm - 6pm)' },
  { value: 'evening', label: 'Noche (6pm - 12am)' },
]

const CATEGORY_LABELS: Record<string, string> = {
  canalizacion: 'Canalización',
  meditacion: 'Meditación',
  sanacion: 'Sanación',
  desarrollo_personal: 'Desarrollo Personal',
  espiritualidad: 'Espiritualidad',
  cristales: 'Cristales',
  registros_akashicos: 'Registros Akáshicos',
}

export default function EventFilters({
  filters,
  onFilterChange,
  availableCategories,
  availableTags,
  availableVenues,
  availableSeries,
  maxPrice,
}: EventFiltersProps) {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (
    key: 'categories' | 'tags' | 'venues' | 'daysOfWeek' | 'timeOfDay' | 'eventSeries',
    value: string | number
  ) => {
    const currentArray = filters[key] as (string | number)[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value]
    updateFilter(key, newArray as FilterState[typeof key])
  }

  const clearAllFilters = () => {
    onFilterChange({
      keyword: '',
      location: '',
      categories: [],
      tags: [],
      venues: [],
      daysOfWeek: [],
      timeOfDay: [],
      dateRange: { from: '', to: '' },
      priceRange: { min: 0, max: maxPrice },
      featuredOnly: false,
      eventSeries: [],
      showPastEvents: false,
      hideCancelled: true,
      virtualFilter: 'all',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.location ||
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.venues.length > 0 ||
    filters.daysOfWeek.length > 0 ||
    filters.timeOfDay.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < maxPrice ||
    filters.featuredOnly ||
    filters.eventSeries.length > 0 ||
    filters.showPastEvents ||
    !filters.hideCancelled ||
    filters.virtualFilter !== 'all'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-gazeta text-xl text-[#654177]">Filtros</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-[#8A4BAF] hover:text-[#654177] flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* Buscar */}
      <FilterSection title="Buscar" defaultOpen={true}>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Palabra clave"
              value={filters.keyword}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF]"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ciudad, región..."
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF]"
            />
          </div>
        </div>
      </FilterSection>

      {/* Categorías */}
      {availableCategories.length > 0 && (
        <FilterSection title="Categorías">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableCategories.map((category) => (
              <label key={category} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => toggleArrayFilter('categories', category)}
                  className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
                />
                <span className="text-sm text-gray-700">
                  {CATEGORY_LABELS[category] || category}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Precio */}
      <FilterSection title="Precio (COP)">
        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={10000}
            value={filters.priceRange.max}
            onChange={(e) =>
              updateFilter('priceRange', {
                ...filters.priceRange,
                max: Number(e.target.value),
              })
            }
            className="w-full accent-[#8A4BAF]"
          />
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>$0</span>
            <span>${filters.priceRange.max.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </FilterSection>

      {/* Etiquetas */}
      {availableTags.length > 0 && (
        <FilterSection title="Etiquetas">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableTags.map((tag) => (
              <label key={tag} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.tags.includes(tag)}
                  onChange={() => toggleArrayFilter('tags', tag)}
                  className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
                />
                <span className="text-sm text-gray-700">{tag}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Lugares */}
      {availableVenues.length > 0 && (
        <FilterSection title="Lugares">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableVenues.map((venue) => (
              <label key={venue} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.venues.includes(venue)}
                  onChange={() => toggleArrayFilter('venues', venue)}
                  className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
                />
                <span className="text-sm text-gray-700">{venue}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Día de la semana */}
      <FilterSection title="Día de la semana">
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <label key={day.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.daysOfWeek.includes(day.value)}
                onChange={() => toggleArrayFilter('daysOfWeek', day.value)}
                className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
              />
              <span className="text-sm text-gray-700">{day.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Hora del día */}
      <FilterSection title="Hora del día">
        <div className="space-y-2">
          {TIME_OF_DAY.map((time) => (
            <label key={time.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.timeOfDay.includes(time.value)}
                onChange={() => toggleArrayFilter('timeOfDay', time.value)}
                className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
              />
              <span className="text-sm text-gray-700">{time.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Rango de fechas */}
      <FilterSection title="Rango de fechas">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateRange.from}
              onChange={(e) =>
                updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateRange.to}
              onChange={(e) =>
                updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF]"
            />
          </div>
        </div>
      </FilterSection>

      {/* Eventos destacados */}
      <FilterSection title="Eventos destacados">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.featuredOnly}
            onChange={(e) => updateFilter('featuredOnly', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
          />
          <span className="text-sm text-gray-700">Solo eventos destacados</span>
        </label>
      </FilterSection>

      {/* Series */}
      {availableSeries.length > 0 && (
        <FilterSection title="Series">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableSeries.map((series) => (
              <label key={series} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.eventSeries.includes(series)}
                  onChange={() => toggleArrayFilter('eventSeries', series)}
                  className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
                />
                <span className="text-sm text-gray-700">{series}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Estado del evento */}
      <FilterSection title="Estado del evento">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showPastEvents}
              onChange={(e) => updateFilter('showPastEvents', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
            />
            <span className="text-sm text-gray-700">Incluir eventos pasados</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hideCancelled}
              onChange={(e) => updateFilter('hideCancelled', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
            />
            <span className="text-sm text-gray-700">Ocultar cancelados</span>
          </label>
        </div>
      </FilterSection>

      {/* Eventos virtuales */}
      <FilterSection title="Eventos virtuales">
        <div className="space-y-2">
          {[
            { value: 'all', label: 'Mostrar todos' },
            { value: 'only', label: 'Solo virtuales' },
            { value: 'hide', label: 'Ocultar virtuales' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="virtualFilter"
                checked={filters.virtualFilter === option.value}
                onChange={() =>
                  updateFilter('virtualFilter', option.value as FilterState['virtualFilter'])
                }
                className="w-4 h-4 border-gray-300 text-[#8A4BAF] focus:ring-[#8A4BAF]"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  )
}
