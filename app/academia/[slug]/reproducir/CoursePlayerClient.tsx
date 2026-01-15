'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CoursePlayer } from '@/components/academia'

interface Lesson {
  _id: string
  title: string
  lessonType: 'video' | 'live' | 'text'
  videoUrl?: string
  videoDuration?: string
  content?: any
  resources?: any[]
}

interface Module {
  _id: string
  title: string
  lessons: Lesson[]
}

interface CoursePlayerClientProps {
  course: {
    _id: string
    title: string
    slug: { current: string }
    courseType: 'simple' | 'modular'
  }
  modules: Module[]
  initialLesson: Lesson
  userId: string
}

interface Progress {
  completionPercentage: number
  completedLessons: string[]
}

export function CoursePlayerClient({
  course,
  modules,
  initialLesson,
  userId,
}: CoursePlayerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentLesson, setCurrentLesson] = useState<Lesson>(initialLesson)
  const [progress, setProgress] = useState<Progress>({
    completionPercentage: 0,
    completedLessons: [],
  })
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)

  // Fetch initial progress
  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(`/api/courses/${course._id}/progress`)
        if (response.ok) {
          const data = await response.json()
          setProgress({
            completionPercentage: data.completionPercentage || 0,
            completedLessons: data.completedLessons || [],
          })
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
      } finally {
        setIsLoadingProgress(false)
      }
    }

    fetchProgress()
  }, [course._id])

  // Handle lesson selection
  const handleLessonSelect = useCallback(
    async (lessonId: string) => {
      // Update URL without full navigation
      const url = new URL(window.location.href)
      url.searchParams.set('lesson', lessonId)
      router.push(url.pathname + url.search, { scroll: false })

      // Find lesson in modules
      let lesson: Lesson | null = null
      for (const module of modules) {
        const found = module.lessons.find((l) => l._id === lessonId)
        if (found) {
          lesson = found
          break
        }
      }

      if (lesson) {
        // Fetch full lesson data
        try {
          const response = await fetch(`/api/courses/${course._id}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonId,
              action: 'access',
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.lesson) {
              setCurrentLesson(data.lesson)
            } else {
              setCurrentLesson(lesson)
            }
          } else {
            setCurrentLesson(lesson)
          }
        } catch {
          setCurrentLesson(lesson)
        }
      }
    },
    [course._id, modules, router]
  )

  // Handle lesson completion
  const handleLessonComplete = useCallback(
    async (lessonId: string) => {
      try {
        const response = await fetch(`/api/courses/${course._id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            completed: true,
          }),
        })

        if (response.ok) {
          const data = await response.json()

          setProgress((prev) => ({
            completionPercentage: data.completionPercentage ?? prev.completionPercentage,
            completedLessons: prev.completedLessons.includes(lessonId)
              ? prev.completedLessons
              : [...prev.completedLessons, lessonId],
          }))
        }
      } catch (error) {
        console.error('Error updating progress:', error)
      }
    },
    [course._id]
  )

  // Handle progress update (video position)
  const handleProgressUpdate = useCallback(
    async (lessonId: string, watchedSeconds: number, position: number) => {
      try {
        await fetch(`/api/courses/${course._id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            watchedSeconds,
            lastPosition: position,
          }),
        })
      } catch (error) {
        console.error('Error saving video progress:', error)
      }
    },
    [course._id]
  )

  // Update current lesson when URL changes
  useEffect(() => {
    const lessonId = searchParams.get('lesson')
    if (lessonId && lessonId !== currentLesson._id) {
      handleLessonSelect(lessonId)
    }
  }, [searchParams, currentLesson._id, handleLessonSelect])

  if (isLoadingProgress) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-[#4944a4] rounded-full mb-4" />
          <div className="h-4 w-32 bg-gray-300 rounded" />
        </div>
      </div>
    )
  }

  return (
    <CoursePlayer
      course={course}
      modules={modules}
      currentLesson={currentLesson}
      progress={progress}
      onLessonComplete={handleLessonComplete}
      onLessonSelect={handleLessonSelect}
      onProgressUpdate={handleProgressUpdate}
    />
  )
}
