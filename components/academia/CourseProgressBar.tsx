'use client'

interface CourseProgressBarProps {
  percentage: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CourseProgressBar({
  percentage,
  showLabel = true,
  size = 'md',
}: CourseProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage))

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="mt-3">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500 font-dm-sans">
            Tu progreso
          </span>
          <span className="text-xs text-[#4944a4] font-dm-sans font-medium">
            {Math.round(clampedPercentage)}%
          </span>
        </div>
      )}

      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="bg-gradient-to-r from-[#4944a4] to-[#8A4BAF] h-full rounded-full transition-all duration-500"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  )
}
