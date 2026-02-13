'use client'

import { Globe } from 'lucide-react'
import { useState, useEffect } from 'react'

import { type Timezone, convertTimeFromColombia, isNextDay, isPreviousDay } from '@/lib/sanity/queries/bookingSettings'

interface TimezoneSelectorProps {
  timezones: Timezone[]
  selectedTimezone: Timezone | null
  onTimezoneChange: (timezone: Timezone) => void
  timezoneNote?: string
  selectedTimeColombia?: string | null // Hora seleccionada en hora Colombia
}

// Zonas horarias por defecto si no hay configuradas en Sanity
const DEFAULT_TIMEZONES: Timezone[] = [
  {
    label: 'Colombia',
    value: 'America/Bogota',
    offsetHours: 0,
    isDefault: true,
  },
  {
    label: 'Mexico',
    value: 'America/Mexico_City',
    offsetHours: -1,
    isDefault: false,
  },
  {
    label: 'Argentina',
    value: 'America/Argentina/Buenos_Aires',
    offsetHours: 2,
    isDefault: false,
  },
  {
    label: 'Espana',
    value: 'Europe/Madrid',
    offsetHours: 6,
    isDefault: false,
  },
]

const STORAGE_KEY = 'energia-divinidad-timezone'

export function TimezoneSelector({
  timezones,
  selectedTimezone,
  onTimezoneChange,
  timezoneNote = 'La sesion sera en hora de Colombia (GMT-5)',
  selectedTimeColombia,
}: TimezoneSelectorProps) {
  const availableTimezones = timezones.length > 0 ? timezones : DEFAULT_TIMEZONES

  // Cargar preferencia de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedTz = availableTimezones.find(tz => tz.value === saved)
      if (savedTz && !selectedTimezone) {
        onTimezoneChange(savedTz)
      }
    }
  }, [availableTimezones, onTimezoneChange, selectedTimezone])

  const handleSelect = (timezone: Timezone) => {
    onTimezoneChange(timezone)
    localStorage.setItem(STORAGE_KEY, timezone.value)
  }

  // Calcular hora convertida si hay una hora seleccionada
  const getConvertedTimeDisplay = () => {
    if (!selectedTimeColombia || !selectedTimezone) {return null}
    if (selectedTimezone.offsetHours === 0) {return null} // Es Colombia, no mostrar

    const convertedTime = convertTimeFromColombia(selectedTimeColombia, selectedTimezone.offsetHours)
    const nextDay = isNextDay(selectedTimeColombia, selectedTimezone.offsetHours)
    const prevDay = isPreviousDay(selectedTimeColombia, selectedTimezone.offsetHours)

    let dayNote = ''
    if (nextDay) {dayNote = ' (dia siguiente)'}
    if (prevDay) {dayNote = ' (dia anterior)'}

    return `${convertedTime}${dayNote} en ${selectedTimezone.label}`
  }

  const convertedTimeDisplay = getConvertedTimeDisplay()

  return (
    <div className="bg-white rounded-xl p-4 border border-[#8A4BAF]/10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-[#8A4BAF]" />
        <span className="font-dm-sans text-sm text-gray-600">Ver horarios en:</span>
      </div>

      {/* Timezone buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {availableTimezones.map((tz) => {
          const isSelected = selectedTimezone?.value === tz.value
          const offsetLabel = tz.offsetHours === 0
            ? 'GMT-5'
            : tz.offsetHours > 0
              ? `GMT${-5 + tz.offsetHours > 0 ? '+' : ''}${-5 + tz.offsetHours}`
              : `GMT${-5 + tz.offsetHours}`

          return (
            <button
              key={tz.value}
              onClick={() => handleSelect(tz)}
              className={`px-3 py-2 rounded-lg font-dm-sans text-sm transition-all ${
                isSelected
                  ? 'bg-[#8A4BAF] text-white shadow-md'
                  : 'bg-[#f8f0f5] text-[#654177] hover:bg-[#8A4BAF]/10'
              }`}
            >
              <span className="font-medium">{tz.label}</span>
              <span className={`block text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                {offsetLabel}
              </span>
            </button>
          )
        })}
      </div>

      {/* Converted time display */}
      {convertedTimeDisplay && (
        <div className="bg-[#eef1fa] rounded-lg p-3 mb-3">
          <p className="font-dm-sans text-sm text-[#2D4CC7]">
            <span className="font-medium">Tu hora local:</span> {convertedTimeDisplay}
          </p>
          <p className="font-dm-sans text-sm text-gray-500 mt-1">
            Hora Colombia: {selectedTimeColombia}
          </p>
        </div>
      )}

      {/* Note */}
      <p className="font-dm-sans text-sm text-gray-500 text-center">
        {timezoneNote}
      </p>
    </div>
  )
}

// Hook para gestionar el estado del timezone
export function useTimezone(timezones: Timezone[]) {
  const availableTimezones = timezones.length > 0 ? timezones : DEFAULT_TIMEZONES
  const defaultTz = availableTimezones.find(tz => tz.isDefault) || availableTimezones[0]

  const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(defaultTz)

  // Cargar preferencia de localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedTz = availableTimezones.find(tz => tz.value === saved)
      if (savedTz) {
        setSelectedTimezone(savedTz)
      }
    }
  }, [availableTimezones])

  return {
    selectedTimezone,
    setSelectedTimezone,
    availableTimezones,
    convertTime: (timeColombia: string) =>
      convertTimeFromColombia(timeColombia, selectedTimezone.offsetHours),
  }
}
