'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  Video,
  Lock,
  Eye,
  Clock,
} from 'lucide-react'
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
}

interface Module {
  _id: string
  title: string
  description?: string
  unlockDate?: string
  lessons: Lesson[]
}

interface CourseContentProps {
  courseType: 'simple' | 'modular'
  modules?: Module[]
  simpleLesson?: Lesson
  hasAccess?: boolean
  dripEnabled?: boolean
  defaultDripDays?: number
  startedAt?: Date | null
  courseId?: string
  onLessonClick?: (lessonId: string) => void
  onPreviewClick?: (lessonId: string) => void
}

function formatDaysUntil(date: Date): string {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Disponible'
  if (diffDays === 1) return 'Disponible mañana'
  if (diffDays < 7) return `Disponible en ${diffDays} días`

  return `Disponible el ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
}

const lessonTypeIcons = {
  video: PlayCircle,
  live: Video,
  text: FileText,
}

export function CourseContent({
  courseType,
  modules,
  simpleLesson,
  hasAccess = false,
  dripEnabled = false,
  defaultDripDays,
  startedAt,
  courseId,
  onLessonClick,
  onPreviewClick,
}: CourseContentProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>(
    modules?.length ? [modules[0]._id] : []
  )

  // Calculate drip availability for all lessons
  const lessonAvailability = useMemo(() => {
    const availability = new Map<string, Date | null>()

    if (!dripEnabled || !hasAccess) {
      return availability
    }

    const courseData = { _id: courseId || '', dripEnabled, defaultDripDays }
    const effectiveStartedAt = startedAt || new Date()

    if (courseType === 'simple' && simpleLesson) {
      const availableAt = calculateDripAvailability(
        simpleLesson,
        courseData,
        effectiveStartedAt,
        0
      )
      availability.set(simpleLesson._id, availableAt)
    } else if (modules) {
      let globalIndex = 0
      for (const module of modules) {
        // Check module unlock date first
        const moduleUnlockDate = module.unlockDate ? new Date(module.unlockDate) : null

        for (const lesson of module.lessons) {
          // If module is locked, use module unlock date
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
    }

    return availability
  }, [dripEnabled, hasAccess, courseId, defaultDripDays, startedAt, courseType, simpleLesson, modules])

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleLessonClick = (lesson: Lesson) => {
    // Free preview always accessible
    if (lesson.isFreePreview && onPreviewClick) {
      onPreviewClick(lesson._id)
      return
    }

    if (!hasAccess) return

    // Check drip availability
    const availableAt = lessonAvailability.get(lesson._id)
    if (availableAt && availableAt > new Date()) {
      return // Lesson is drip-locked
    }

    if (onLessonClick) {
      onLessonClick(lesson._id)
    }
  }

  const isDripLocked = (lessonId: string): boolean => {
    if (!hasAccess || !dripEnabled) return false
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

  // Simple course - single lesson
  if (courseType === 'simple' && simpleLesson) {
    const Icon = lessonTypeIcons[simpleLesson.lessonType]
    const dripLocked = isDripLocked(simpleLesson._id)
    const dripAvailableAt = getDripAvailableAt(simpleLesson._id)
    const canAccessLesson = (hasAccess && !dripLocked) || simpleLesson.isFreePreview

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-gazeta text-2xl text-[#654177] mb-6">Contenido</h2>

        <button
          onClick={() => handleLessonClick(simpleLesson)}
          disabled={!canAccessLesson}
          className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors ${
            canAccessLesson
              ? 'border-[#4944a4] bg-[#4944a4]/5 hover:bg-[#4944a4]/10 cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              canAccessLesson
                ? 'bg-[#4944a4] text-white'
                : dripLocked
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {dripLocked ? <Clock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>

          <div className="flex-1 text-left">
            <p className="font-dm-sans font-medium text-gray-900">
              {simpleLesson.title}
            </p>
            {dripLocked && dripAvailableAt ? (
              <p className="text-sm text-amber-600 font-dm-sans">
                {formatDaysUntil(dripAvailableAt)}
              </p>
            ) : simpleLesson.videoDuration ? (
              <p className="text-sm text-gray-500 font-dm-sans">
                {simpleLesson.videoDuration}
              </p>
            ) : null}
          </div>

          {dripLocked ? (
            <Clock className="h-5 w-5 text-amber-500" />
          ) : !hasAccess && !simpleLesson.isFreePreview ? (
            <Lock className="h-5 w-5 text-gray-400" />
          ) : simpleLesson.isFreePreview && !hasAccess ? (
            <span className="flex items-center gap-1 text-xs text-[#4944a4] font-dm-sans font-medium">
              <Eye className="h-4 w-4" />
              Vista previa
            </span>
          ) : null}
        </button>
      </div>
    )
  }

  // Modular course - multiple modules with lessons
  if (!modules || modules.length === 0) {
    return null
  }

  // Count totals
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-gazeta text-2xl text-[#654177]">
          Contenido del Curso
        </h2>
        <p className="text-sm text-gray-500 font-dm-sans">
          {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'} ·{' '}
          {totalLessons} {totalLessons === 1 ? 'lección' : 'lecciones'}
        </p>
      </div>

      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.includes(module._id)

          return (
            <div
              key={module._id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module._id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#4944a4] text-white text-sm font-dm-sans font-medium">
                    {moduleIndex + 1}
                  </span>
                  <div className="text-left">
                    <h3 className="font-dm-sans font-semibold text-gray-900">
                      {module.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-dm-sans">
                      {module.lessons.length}{' '}
                      {module.lessons.length === 1 ? 'lección' : 'lecciones'}
                    </p>
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Module Lessons */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const Icon = lessonTypeIcons[lesson.lessonType]
                    const dripLocked = isDripLocked(lesson._id)
                    const dripAvailableAt = getDripAvailableAt(lesson._id)
                    const canAccessThisLesson =
                      (hasAccess && !dripLocked) || lesson.isFreePreview

                    return (
                      <button
                        key={lesson._id}
                        onClick={() => handleLessonClick(lesson)}
                        disabled={!canAccessThisLesson}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                          canAccessThisLesson
                            ? 'hover:bg-gray-50 cursor-pointer'
                            : 'cursor-not-allowed opacity-70'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 p-1.5 rounded ${
                            canAccessThisLesson
                              ? 'text-[#4944a4]'
                              : dripLocked
                                ? 'text-amber-500'
                                : 'text-gray-400'
                          }`}
                        >
                          {dripLocked ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-dm-sans text-sm truncate ${
                              canAccessThisLesson
                                ? 'text-gray-900'
                                : dripLocked
                                  ? 'text-gray-700'
                                  : 'text-gray-500'
                            }`}
                          >
                            {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                          </p>
                          {dripLocked && dripAvailableAt && (
                            <p className="text-xs text-amber-600 font-dm-sans mt-0.5">
                              {formatDaysUntil(dripAvailableAt)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!dripLocked && lesson.videoDuration && (
                            <span className="text-xs text-gray-400 font-dm-sans">
                              {lesson.videoDuration}
                            </span>
                          )}

                          {dripLocked ? (
                            <Clock className="h-4 w-4 text-amber-400" />
                          ) : !hasAccess && lesson.isFreePreview ? (
                            <span className="flex items-center gap-1 text-xs text-[#4944a4] font-dm-sans font-medium">
                              <Eye className="h-3 w-3" />
                              Gratis
                            </span>
                          ) : !canAccessThisLesson ? (
                            <Lock className="h-4 w-4 text-gray-300" />
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
