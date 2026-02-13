'use client'

import { Play, BookOpen } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { urlFor } from '@/sanity/lib/image'

import { CourseProgressBar } from './CourseProgressBar'

interface PurchasedCourseCardProps {
  course: {
    _id: string
    title: string
    slug: { current: string }
    coverImage?: any
    lessonCount?: number
    totalDuration?: string
  }
  progress: {
    completionPercentage: number
    completedLessons: number
    lastAccessedAt?: string
  }
}

export function PurchasedCourseCard({
  course,
  progress,
}: PurchasedCourseCardProps) {
  const isCompleted = progress.completionPercentage >= 100
  const hasStarted = progress.completionPercentage > 0

  return (
    <Link
      href={`/academia/${course.slug.current}/reproducir`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {course.coverImage ? (
          <Image
            src={urlFor(course.coverImage).width(640).height(360).url()}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#8A4BAF]/20 to-[#4944a4]/20 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-[#8A4BAF]/40" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {isCompleted ? (
            <span className="bg-green-500 text-white text-xs font-dm-sans font-semibold px-2.5 py-1 rounded-full">
              Completado
            </span>
          ) : hasStarted ? (
            <span className="bg-[#4944a4] text-white text-xs font-dm-sans font-semibold px-2.5 py-1 rounded-full">
              En progreso
            </span>
          ) : (
            <span className="bg-gray-500 text-white text-xs font-dm-sans font-semibold px-2.5 py-1 rounded-full">
              Sin empezar
            </span>
          )}
        </div>

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="bg-white rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
            <Play className="h-6 w-6 text-[#4944a4] fill-[#4944a4]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-gazeta text-lg text-[#654177] group-hover:text-[#8A4BAF] transition-colors line-clamp-2 mb-2">
          {course.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 font-dm-sans mb-3">
          {course.lessonCount && (
            <span>
              {progress.completedLessons}/{course.lessonCount} lecciones
            </span>
          )}
          {course.totalDuration && <span>{course.totalDuration}</span>}
        </div>

        {/* Progress Bar */}
        <div className="mt-auto">
          <CourseProgressBar
            percentage={progress.completionPercentage}
            size="sm"
          />
        </div>

        {/* Last accessed */}
        {progress.lastAccessedAt && hasStarted && (
          <p className="text-xs text-gray-400 font-dm-sans mt-2">
            Último acceso:{' '}
            {new Date(progress.lastAccessedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        )}
      </div>
    </Link>
  )
}
