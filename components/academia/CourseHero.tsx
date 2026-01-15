'use client'

import Image from 'next/image'
import { Clock, BookOpen, BarChart3, Play, CheckCircle } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'

interface CourseHeroProps {
  course: {
    title: string
    shortDescription?: string
    coverImage?: any
    previewVideoUrl?: string
    totalDuration?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    courseType: 'simple' | 'modular'
    moduleCount?: number
    lessonCount?: number
    instructor?: string
    whatYouWillLearn?: string[]
  }
  onPlayPreview?: () => void
}

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export function CourseHero({ course, onPlayPreview }: CourseHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-[#654177] to-[#4944a4] text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            {/* Course type badge */}
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-dm-sans font-medium px-3 py-1 rounded-full mb-3 sm:mb-4">
              {course.courseType === 'simple' ? 'Meditación / Lección' : 'Curso Modular'}
            </span>

            {/* Title */}
            <h1 className="font-gazeta text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-3 sm:mb-4">
              {course.title}
            </h1>

            {/* Description */}
            {course.shortDescription && (
              <p className="text-white/90 text-base sm:text-lg font-dm-sans mb-4 sm:mb-6 max-w-xl mx-auto lg:mx-0">
                {course.shortDescription}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 mb-6 sm:mb-8">
              {course.totalDuration && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-white/80 text-sm sm:text-base">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-dm-sans">{course.totalDuration}</span>
                </div>
              )}
              {course.lessonCount && course.lessonCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-white/80 text-sm sm:text-base">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-dm-sans">
                    {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'}
                  </span>
                </div>
              )}
              {course.difficulty && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-white/80 text-sm sm:text-base">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-dm-sans">{difficultyLabels[course.difficulty]}</span>
                </div>
              )}
            </div>

            {/* Instructor */}
            {course.instructor && (
              <p className="text-white/70 font-dm-sans text-sm sm:text-base">
                Impartido por <span className="text-white font-medium">{course.instructor}</span>
              </p>
            )}
          </div>

          {/* Right: Image/Video Preview */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video">
              {course.coverImage ? (
                <Image
                  src={urlFor(course.coverImage).width(1280).height(720).url()}
                  alt={course.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-white/30" />
                </div>
              )}

              {/* Play button overlay */}
              {course.previewVideoUrl && onPlayPreview && (
                <button
                  onClick={onPlayPreview}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                  aria-label="Ver vista previa"
                >
                  <div className="bg-white rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-[#4944a4] fill-[#4944a4]" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* What you'll learn */}
        {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
          <div className="mt-8 sm:mt-12 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
            <h2 className="font-gazeta text-xl sm:text-2xl text-white mb-4 sm:mb-6">
              Lo que aprenderás
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {course.whatYouWillLearn.map((item, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90 font-dm-sans text-sm sm:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
