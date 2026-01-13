'use client';

import { useState } from 'react';
import { TimeSlot } from '@/lib/availability/time-slots';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  isLoading?: boolean;
  hasDateSelected?: boolean;
  timezoneLabel?: string; // Etiqueta de la zona horaria seleccionada (ej: "Mexico", "Espana")
}

export default function TimeSlotPicker({
  slots,
  selectedTime,
  onSelectTime,
  isLoading = false,
  hasDateSelected = true,
  timezoneLabel,
}: TimeSlotPickerProps) {
  const [is24Hour, setIs24Hour] = useState(true);

  // Función para convertir hora de 24h a 12h
  const convertTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  // Función para formatear el label según el formato seleccionado
  const formatTimeLabel = (label: string): string => {
    if (is24Hour) return label;

    // Convertir "17:00 - 18:00" a "5:00pm - 6:00pm"
    const [start, end] = label.split(' - ');
    return `${convertTo12Hour(start)} - ${convertTo12Hour(end)}`;
  };

  // Usar los slots que vienen (ya convertidos a la zona horaria desde booking-calendar)
  const displaySlots = slots;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-12 bg-gray-100 animate-pulse rounded-md" />
        <div className="h-12 bg-gray-100 animate-pulse rounded-md" />
        <div className="h-12 bg-gray-100 animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div>
      {/* Indicador de zona horaria y selector de formato */}
      <div className="flex items-center justify-between mb-4">
        {/* Indicador de zona horaria */}
        {timezoneLabel && timezoneLabel !== 'Colombia' && (
          <div className="flex items-center gap-1.5 text-sm text-[#2D4CC7] bg-[#eef1fa] px-3 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Hora {timezoneLabel}</span>
          </div>
        )}
        {(!timezoneLabel || timezoneLabel === 'Colombia') && <div />}

        {/* Selector de formato 12h/24h */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setIs24Hour(false)}
            className={`
              px-3 py-1 text-sm font-medium rounded-md transition-all font-dm-sans
              ${
                !is24Hour
                  ? 'bg-[#8A4BAF]/10 text-[#8A4BAF]'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            12h
          </button>
          <button
            onClick={() => setIs24Hour(true)}
            className={`
              px-3 py-1 text-sm font-medium rounded-md transition-all font-dm-sans
              ${
                is24Hour
                  ? 'bg-[#8A4BAF]/10 text-[#8A4BAF]'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            24h
          </button>
        </div>
      </div>

      {/* Franjas horarias */}
      <div className="space-y-3">
        {displaySlots.length === 0 ? (
          <div className="text-center py-6 text-gray-500 font-dm-sans">
            <p>No hay horarios disponibles para esta fecha</p>
          </div>
        ) : (
          displaySlots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => onSelectTime(slot.time)}
              disabled={!hasDateSelected}
              className={`
                w-full px-4 py-3 rounded-lg font-medium transition-all font-dm-sans
                flex items-center justify-center
                ${
                  !hasDateSelected
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    : selectedTime === slot.time
                    ? 'bg-[#8A4BAF] text-white shadow-md ring-2 ring-[#8A4BAF] ring-offset-2'
                    : 'bg-[#f8f0f5] text-[#654177] border border-[#8A4BAF]/30 shadow-sm hover:border-[#8A4BAF] hover:bg-[#efe3ed]'
                }
              `}
            >
              <span className="text-sm">{formatTimeLabel(slot.label)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
