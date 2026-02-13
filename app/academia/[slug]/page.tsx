import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { auth } from '@/lib/auth'
import { sanityFetch } from '@/sanity/lib/fetch'
import { COURSE_BY_SLUG_QUERY, COURSES_QUERY } from '@/sanity/lib/queries'

import { CourseDetailClient } from './CourseDetailClient'

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  })

  if (!course) {
    return {
      title: 'Curso no encontrado | Academia',
    }
  }

  return {
    title: `${course.title} | Academia`,
    description: course.shortDescription || course.description?.slice(0, 160),
    openGraph: {
      title: course.title,
      description: course.shortDescription || '',
      images: course.coverImage ? [course.coverImage] : [],
    },
  }
}

export async function generateStaticParams() {
  // Skip during build if Sanity is not configured
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return []
  }

  try {
    const courses = await sanityFetch<{ slug: string }[]>({
      query: COURSES_QUERY,
    })

    return (courses || []).map((course) => ({
      slug: course.slug,
    }))
  } catch {
    return []
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const session = await auth()

  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  })

  if (!course) {
    notFound()
  }

  // Calculate lesson count
  let lessonCount = 0
  if (course.courseType === 'simple' && course.simpleLesson) {
    lessonCount = 1
  } else if (course.modules) {
    lessonCount = course.modules.reduce(
      (acc: number, m: any) => acc + (m.lessons?.length || 0),
      0
    )
  }

  return (
    <>
      <Header session={session} />
      <main className="min-h-screen bg-white">
        <CourseDetailClient course={{ ...course, lessonCount }} />
      </main>
      <Footer />
    </>
  )
}
