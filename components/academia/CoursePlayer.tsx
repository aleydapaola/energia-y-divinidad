'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Menu, X } from 'lucide-react'
import { LessonVideo } from './LessonVideo'
import { LessonResources } from './LessonResources'
import { LessonList } from './LessonList'
import { CourseProgressBar } from './CourseProgressBar'
import type { PortableTextBlock } from '@portabletext/types'
import { PortableText } from '@portabletext/react'

interface Resource {
  _key: string
  title: string
  resourceType: 'pdf' | 'audio' | 'video' | 'link' | 'powerpoint' | 'image' | 'other'
  file?: { asset: { url: string } }
  externalUrl?: string
  description?: string
}

interface Lesson {
  _id: string
  title: string
  lessonType: 'video' | 'live' | 'text'
  videoUrl?: string
  videoDuration?: string
  content?: PortableTextBlock[]
  resources?: Resource[]
  completed?: boolean
}

interface Module {
  _id: string
  title: string
  lessons: Lesson[]
}

interface CoursePlayerProps {
  course: {
    _id: string
    title: string
    slug: { current: string }
    courseType: 'simple' | 'modular'
  }
  modules: Module[]
  currentLesson: Lesson
  progress: {
    completionPercentage: number
    completedLessons: string[]
  }
  onLessonComplete: (lessonId: string) => void
  onLessonSelect: (lessonId: string) => void
  onProgressUpdate: (lessonId: string, watchedSeconds: number, position: number) => void
}

export function CoursePlayer({
  course,
  modules,
  currentLesson,
  progress,
  onLessonComplete,
  onLessonSelect,
  onProgressUpdate,
}: CoursePlayerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Flatten lessons for navigation
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m._id, moduleTitle: m.title }))
  )

  const currentIndex = allLessons.findIndex((l) => l._id === currentLesson._id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const handleVideoEnd = () => {
    if (!progress.completedLessons.includes(currentLesson._id)) {
      onLessonComplete(currentLesson._id)
    }
  }

  const handleMarkComplete = () => {
    if (!progress.completedLessons.includes(currentLesson._id)) {
      onLessonComplete(currentLesson._id)
    }
    // Auto-advance to next lesson
    if (nextLesson) {
      onLessonSelect(nextLesson._id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/academia/${course.slug.current}`}
              className="flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al curso
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2 className="font-gazeta text-lg text-[#654177] line-clamp-2">
            {course.title}
          </h2>

          <CourseProgressBar percentage={progress.completionPercentage} />
        </div>

        {/* Lesson List */}
        <div className="overflow-y-auto h-[calc(100vh-180px)]">
          <LessonList
            modules={modules}
            currentLessonId={currentLesson._id}
            completedLessons={progress.completedLessons}
            onLessonSelect={(id) => {
              onLessonSelect(id)
              setSidebarOpen(false)
            }}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar (Mobile) */}
        <div className="lg:hidden sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-4 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-[#4944a4]"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="font-dm-sans font-medium text-gray-900 truncate">
            {currentLesson.title}
          </h2>
        </div>

        {/* Video or Content */}
        <div className="bg-black">
          {currentLesson.lessonType === 'video' && currentLesson.videoUrl ? (
            <LessonVideo
              videoUrl={currentLesson.videoUrl}
              lessonId={currentLesson._id}
              onEnd={handleVideoEnd}
              onProgress={(seconds, position) =>
                onProgressUpdate(currentLesson._id, seconds, position)
              }
            />
          ) : currentLesson.lessonType === 'live' && currentLesson.videoUrl ? (
            <LessonVideo
              videoUrl={currentLesson.videoUrl}
              lessonId={currentLesson._id}
              onEnd={handleVideoEnd}
              onProgress={(seconds, position) =>
                onProgressUpdate(currentLesson._id, seconds, position)
              }
            />
          ) : (
            <div className="aspect-video bg-gradient-to-br from-[#654177] to-[#4944a4] flex items-center justify-center">
              <span className="text-white/50 font-dm-sans">
                Contenido de texto
              </span>
            </div>
          )}
        </div>

        {/* Lesson Content */}
        <div className="p-6 lg:p-8 max-w-4xl">
          {/* Lesson Title */}
          <h1 className="font-gazeta text-2xl lg:text-3xl text-[#654177] mb-4">
            {currentLesson.title}
          </h1>

          {/* Text Content */}
          {currentLesson.lessonType === 'text' && currentLesson.content && (
            <div className="prose prose-lg max-w-none font-dm-sans mb-8">
              <PortableText value={currentLesson.content} />
            </div>
          )}

          {/* Resources */}
          {currentLesson.resources && currentLesson.resources.length > 0 && (
            <LessonResources resources={currentLesson.resources} />
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Previous */}
              {prevLesson ? (
                <button
                  onClick={() => onLessonSelect(prevLesson._id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
              ) : (
                <div />
              )}

              {/* Mark Complete / Next */}
              <button
                onClick={handleMarkComplete}
                className="flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {progress.completedLessons.includes(currentLesson._id)
                  ? nextLesson
                    ? 'Siguiente Lección'
                    : 'Completado'
                  : nextLesson
                    ? 'Completar y Continuar'
                    : 'Marcar como Completado'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
