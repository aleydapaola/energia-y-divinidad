'use client'

import { PlayCircle, FileText, Video, Check } from 'lucide-react'

interface Lesson {
  _id: string
  title: string
  lessonType: 'video' | 'live' | 'text'
  videoDuration?: string
}

interface Module {
  _id: string
  title: string
  lessons: Lesson[]
}

interface LessonListProps {
  modules: Module[]
  currentLessonId: string
  completedLessons: string[]
  onLessonSelect: (lessonId: string) => void
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
}: LessonListProps) {
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

              return (
                <button
                  key={lesson._id}
                  onClick={() => onLessonSelect(lesson._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[#4944a4]/10 border-l-4 border-[#4944a4]'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  {/* Completion/Icon indicator */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-[#4944a4] text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Lesson info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-dm-sans text-sm truncate ${
                        isActive
                          ? 'text-[#4944a4] font-medium'
                          : isCompleted
                            ? 'text-gray-500'
                            : 'text-gray-700'
                      }`}
                    >
                      {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                    </p>
                    {lesson.videoDuration && (
                      <p className="text-xs text-gray-400 font-dm-sans">
                        {lesson.videoDuration}
                      </p>
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
