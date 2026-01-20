'use client'

import { useMemo } from 'react'
import { PlayCircle, FileText, Video, Check, Clock, Lock, ClipboardList } from 'lucide-react'
import { calculateDripAvailability, type DripMode } from '@/lib/course-access'

interface Lesson {
  _id: string
  title: string
  order?: number
  lessonType: 'video' | 'live' | 'text'
  videoDuration?: string
  isFreePreview?: boolean
  dripMode?: DripMode
  dripOffsetDays?: number
  availableAt?: string
  quizId?: string
  requiresQuizToComplete?: boolean
}

interface Module {
  _id: string
  title: string
  unlockDate?: string
  lessons: Lesson[]
}

interface LessonListProps {
  modules: Module[]
  currentLessonId: string
  completedLessons: string[]
  onLessonSelect: (lessonId: string) => void
  dripEnabled?: boolean
  defaultDripDays?: number
  startedAt?: Date | null
  courseId?: string
}

function formatDaysUntil(date: Date): string {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Disponible'
  if (diffDays === 1) return 'Mañana'
  if (diffDays < 7) return `${diffDays} días`

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const lessonTypeIcons = {
  video: PlayCircle,
  live: Video,
  text: FileText,
}

export function LessonList({
  modules,
  currentLessonId,
  completedLessons,
  onLessonSelect,
  dripEnabled = false,
  defaultDripDays,
  startedAt,
  courseId,
}: LessonListProps) {
  // Calculate drip availability for all lessons
  const lessonAvailability = useMemo(() => {
    const availability = new Map<string, Date | null>()

    if (!dripEnabled) {
      return availability
    }

    const courseData = { _id: courseId || '', dripEnabled, defaultDripDays }
    const effectiveStartedAt = startedAt || new Date()

    let globalIndex = 0
    for (const module of modules) {
      const moduleUnlockDate = module.unlockDate ? new Date(module.unlockDate) : null

      for (const lesson of module.lessons) {
        if (moduleUnlockDate && moduleUnlockDate > new Date()) {
          availability.set(lesson._id, moduleUnlockDate)
        } else {
          const availableAt = calculateDripAvailability(
            lesson,
            courseData,
            effectiveStartedAt,
            globalIndex
          )
          availability.set(lesson._id, availableAt)
        }
        globalIndex++
      }
    }

    return availability
  }, [dripEnabled, courseId, defaultDripDays, startedAt, modules])

  const isDripLocked = (lessonId: string, isFreePreview?: boolean): boolean => {
    if (isFreePreview) return false
    if (!dripEnabled) return false
    const availableAt = lessonAvailability.get(lessonId)
    return availableAt !== null && availableAt !== undefined && availableAt > new Date()
  }

  const getDripAvailableAt = (lessonId: string): Date | null => {
    const availableAt = lessonAvailability.get(lessonId)
    if (availableAt && availableAt > new Date()) {
      return availableAt
    }
    return null
  }

  const handleLessonClick = (lesson: Lesson) => {
    if (isDripLocked(lesson._id, lesson.isFreePreview)) {
      return
    }
    onLessonSelect(lesson._id)
  }

  return (
    <div className="divide-y divide-gray-100">
      {modules.map((module, moduleIndex) => (
        <div key={module._id}>
          {/* Module Header */}
          <div className="px-4 py-3 bg-gray-50">
            <h3 className="font-dm-sans font-semibold text-sm text-gray-700">
              {moduleIndex + 1}. {module.title}
            </h3>
          </div>

          {/* Lessons */}
          <div>
            {module.lessons.map((lesson, lessonIndex) => {
              const Icon = lessonTypeIcons[lesson.lessonType]
              const isActive = lesson._id === currentLessonId
              const isCompleted = completedLessons.includes(lesson._id)
              const dripLocked = isDripLocked(lesson._id, lesson.isFreePreview)
              const dripAvailableAt = getDripAvailableAt(lesson._id)

              return (
                <button
                  key={lesson._id}
                  onClick={() => handleLessonClick(lesson)}
                  disabled={dripLocked}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    dripLocked
                      ? 'opacity-60 cursor-not-allowed'
                      : isActive
                        ? 'bg-[#4944a4]/10 border-l-4 border-[#4944a4]'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                  } ${!isActive && !dripLocked ? 'border-l-4 border-transparent' : ''}`}
                >
                  {/* Completion/Icon indicator */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      dripLocked
                        ? 'bg-amber-100 text-amber-600'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-[#4944a4] text-white'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {dripLocked ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Lesson info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-dm-sans text-sm truncate ${
                        dripLocked
                          ? 'text-gray-500'
                          : isActive
                            ? 'text-[#4944a4] font-medium'
                            : isCompleted
                              ? 'text-gray-500'
                              : 'text-gray-700'
                      }`}
                    >
                      {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                    </p>
                    {dripLocked && dripAvailableAt ? (
                      <p className="text-xs text-amber-600 font-dm-sans">
                        {formatDaysUntil(dripAvailableAt)}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        {lesson.videoDuration && (
                          <span className="text-xs text-gray-400 font-dm-sans">
                            {lesson.videoDuration}
                          </span>
                        )}
                        {lesson.quizId && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#8A4BAF] font-dm-sans">
                            <ClipboardList className="h-3 w-3" />
                            Quiz
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
