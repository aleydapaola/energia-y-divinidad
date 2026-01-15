import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { sanityFetch } from '@/sanity/lib/fetch'
import { COURSE_BY_SLUG_QUERY, LESSON_BY_ID_QUERY } from '@/sanity/lib/queries'
import { canAccessCourse } from '@/lib/course-access'
import { CoursePlayerClient } from './CoursePlayerClient'

interface ReproducirPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lesson?: string }>
}

export async function generateMetadata({
  params,
}: ReproducirPageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  })

  if (!course) {
    return { title: 'Curso no encontrado' }
  }

  return {
    title: `${course.title} - Reproducir | Academia`,
    robots: 'noindex, nofollow', // Private content
  }
}

export default async function ReproducirPage({
  params,
  searchParams,
}: ReproducirPageProps) {
  const { slug } = await params
  const { lesson: lessonIdParam } = await searchParams

  // Check authentication
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/academia/${slug}/reproducir`)
  }

  // Fetch course
  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  })

  if (!course) {
    notFound()
  }

  // Check access
  const access = await canAccessCourse(session.user.id, course._id)

  if (!access.hasAccess) {
    redirect(`/academia/${slug}`)
  }

  // Build modules array for the player
  let modules: any[] = []

  if (course.courseType === 'simple' && course.simpleLesson) {
    // For simple courses, create a single module with the lesson
    modules = [
      {
        _id: 'main',
        title: 'Contenido',
        lessons: [course.simpleLesson],
      },
    ]
  } else if (course.modules) {
    modules = course.modules.map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).filter((l: any) => l.published !== false),
    }))
  }

  // Get all lessons flat
  const allLessons = modules.flatMap((m) => m.lessons || [])

  if (allLessons.length === 0) {
    redirect(`/academia/${slug}`)
  }

  // Determine current lesson
  let currentLessonId = lessonIdParam

  if (!currentLessonId || !allLessons.find((l: any) => l._id === currentLessonId)) {
    // Default to first lesson
    currentLessonId = allLessons[0]._id
  }

  // Fetch full lesson data
  const currentLesson = await sanityFetch<any>({
    query: LESSON_BY_ID_QUERY,
    params: { id: currentLessonId },
  })

  if (!currentLesson) {
    redirect(`/academia/${slug}`)
  }

  return (
    <CoursePlayerClient
      course={{
        _id: course._id,
        title: course.title,
        slug: course.slug,
        courseType: course.courseType,
      }}
      modules={modules}
      initialLesson={currentLesson}
      userId={session.user.id}
    />
  )
}
