'use client'

import { Clock, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface QuizTimerProps {
  timeLimit: number // in minutes
  startedAt: Date
  onTimeUp: () => void
}

export function QuizTimer({ timeLimit, startedAt, onTimeUp }: QuizTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    return Math.max(0, timeLimit * 60 - elapsed)
  })

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onTimeUp()
      return
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1
        if (newValue <= 0) {
          clearInterval(timer)
          onTimeUp()
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingSeconds, onTimeUp])

  // Format time
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Warning states
  const isWarning = remainingSeconds <= 60 && remainingSeconds > 30
  const isCritical = remainingSeconds <= 30

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-dm-sans
        ${
          isCritical
            ? 'bg-red-100 text-red-700'
            : isWarning
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
        }
      `}
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5 animate-pulse" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span className="font-mono font-semibold text-lg">{formattedTime}</span>
      {isCritical && (
        <span className="text-sm">¡Tiempo casi agotado!</span>
      )}
    </div>
  )
}
