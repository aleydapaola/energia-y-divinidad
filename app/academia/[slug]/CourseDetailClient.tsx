'use client'

import { PortableText } from '@portabletext/react'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

import { CourseHero, CourseContent, CourseSidebar } from '@/components/academia'
import { useCartStore } from '@/lib/stores/cart-store'


interface Lesson {
  _id: string
  title: string
  slug?: { current: string }
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

interface CourseDetailClientProps {
  course: {
    _id: string
    title: string
    slug: { current: string }
    shortDescription?: string
    description?: any
    coverImage?: any
    previewVideoUrl?: string
    courseType: 'simple' | 'modular'
    simpleLesson?: Lesson
    modules?: Module[]
    price: number
    priceUSD: number
    compareAtPrice?: number
    compareAtPriceUSD?: number
    totalDuration?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    lessonCount?: number
    instructor?: string
    whatYouWillLearn?: string[]
    requirements?: string[]
    includedInMembership?: boolean
    membershipTiers?: { _id: string; name: string }[]
  }
}

export function CourseDetailClient({ course }: CourseDetailClientProps) {
  const { data: session, status } = useSession()
  const currency = useCartStore((state) => state.currency)

  const [hasAccess, setHasAccess] = useState(false)
  const [hasMembership, setHasMembership] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check user access
  useEffect(() => {
    async function checkAccess() {
      if (status === 'loading') {return}

      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/courses/${course._id}/access`)
        const data = await response.json()

        setHasAccess(data.hasAccess || false)
        setHasMembership(data.hasMembership || false)
      } catch (error) {
        console.error('Error checking course access:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [session, status, course._id])

  const handlePreviewClick = (lessonId: string) => {
    // TODO: Open modal or navigate to preview
    console.log('Preview lesson:', lessonId)
  }

  return (
    <>
      {/* Hero */}
      <CourseHero
        course={{
          title: course.title,
          shortDescription: course.shortDescription,
          coverImage: course.coverImage,
          previewVideoUrl: course.previewVideoUrl,
          totalDuration: course.totalDuration,
          difficulty: course.difficulty,
          courseType: course.courseType,
          lessonCount: course.lessonCount,
          instructor: course.instructor,
          whatYouWillLearn: course.whatYouWillLearn,
        }}
      />

      {/* Content */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {course.description && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
                    Descripción
                  </h2>
                  <div className="prose prose-lg max-w-none font-dm-sans text-gray-600">
                    <PortableText value={course.description} />
                  </div>
                </div>
              )}

              {/* Requirements */}
              {course.requirements && course.requirements.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
                    Requisitos
                  </h2>
                  <ul className="space-y-2">
                    {course.requirements.map((req, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-600 font-dm-sans"
                      >
                        <span className="text-[#4944a4]">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course Content */}
              <CourseContent
                courseType={course.courseType}
                modules={course.modules}
                simpleLesson={course.simpleLesson}
                hasAccess={hasAccess}
                onLessonClick={(lessonId) => {
                  window.location.href = `/academia/${course.slug.current}/reproducir?lesson=${lessonId}`
                }}
                onPreviewClick={handlePreviewClick}
              />

              {/* Instructor */}
              {course.instructor && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
                    Tu Instructora
                  </h2>
                  <p className="text-gray-600 font-dm-sans">
                    {course.instructor}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <CourseSidebar
                course={course}
                currency={currency}
                hasAccess={hasAccess}
                hasMembership={hasMembership}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
