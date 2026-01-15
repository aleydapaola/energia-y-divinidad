'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  Video,
  Lock,
  Eye,
} from 'lucide-react'

interface Lesson {
  _id: string
  title: string
  lessonType: 'video' | 'live' | 'text'
  videoDuration?: string
  isFreePreview?: boolean
}

interface Module {
  _id: string
  title: string
  description?: string
  lessons: Lesson[]
}

interface CourseContentProps {
  courseType: 'simple' | 'modular'
  modules?: Module[]
  simpleLesson?: Lesson
  hasAccess?: boolean
  onLessonClick?: (lessonId: string) => void
  onPreviewClick?: (lessonId: string) => void
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
  onLessonClick,
  onPreviewClick,
}: CourseContentProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>(
    modules?.length ? [modules[0]._id] : []
  )

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleLessonClick = (lesson: Lesson) => {
    if (hasAccess && onLessonClick) {
      onLessonClick(lesson._id)
    } else if (lesson.isFreePreview && onPreviewClick) {
      onPreviewClick(lesson._id)
    }
  }

  // Simple course - single lesson
  if (courseType === 'simple' && simpleLesson) {
    const Icon = lessonTypeIcons[simpleLesson.lessonType]

    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-gazeta text-2xl text-[#654177] mb-6">Contenido</h2>

        <button
          onClick={() => handleLessonClick(simpleLesson)}
          className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors ${
            hasAccess || simpleLesson.isFreePreview
              ? 'border-[#4944a4] bg-[#4944a4]/5 hover:bg-[#4944a4]/10 cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              hasAccess || simpleLesson.isFreePreview
                ? 'bg-[#4944a4] text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 text-left">
            <p className="font-dm-sans font-medium text-gray-900">
              {simpleLesson.title}
            </p>
            {simpleLesson.videoDuration && (
              <p className="text-sm text-gray-500 font-dm-sans">
                {simpleLesson.videoDuration}
              </p>
            )}
          </div>

          {!hasAccess && !simpleLesson.isFreePreview ? (
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
                    const canAccess = hasAccess || lesson.isFreePreview

                    return (
                      <button
                        key={lesson._id}
                        onClick={() => handleLessonClick(lesson)}
                        disabled={!canAccess}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                          canAccess
                            ? 'hover:bg-gray-50 cursor-pointer'
                            : 'cursor-not-allowed opacity-70'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 p-1.5 rounded ${
                            canAccess
                              ? 'text-[#4944a4]'
                              : 'text-gray-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-dm-sans text-sm truncate ${
                              canAccess ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {lesson.videoDuration && (
                            <span className="text-xs text-gray-400 font-dm-sans">
                              {lesson.videoDuration}
                            </span>
                          )}

                          {!hasAccess && lesson.isFreePreview ? (
                            <span className="flex items-center gap-1 text-xs text-[#4944a4] font-dm-sans font-medium">
                              <Eye className="h-3 w-3" />
                              Gratis
                            </span>
                          ) : !canAccess ? (
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
