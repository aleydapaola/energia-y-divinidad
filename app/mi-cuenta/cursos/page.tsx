import { GraduationCap } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getUserCourses } from '@/lib/course-access'
import { sanityFetch } from '@/sanity/lib/fetch'
import { COURSES_BY_IDS_QUERY } from '@/sanity/lib/queries'

import { MisCursosClient } from './MisCursosClient'

export const metadata: Metadata = {
  title: 'Mis Cursos | Mi Cuenta',
  description: 'Accede a tus cursos comprados y continúa tu aprendizaje',
  robots: 'noindex, nofollow',
}

export default async function MiCuentaCursosPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/mi-cuenta/cursos')
  }

  // Get user's course entitlements and progress
  const userCourses = await getUserCourses(session.user.id)

  // If no courses, show empty state
  if (userCourses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-gazeta text-3xl text-[#654177]">Mis Cursos</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-[#f8f0f5] rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-[#8A4BAF]" />
          </div>
          <h2 className="font-gazeta text-2xl text-[#654177] mb-2">
            Aún no tienes cursos
          </h2>
          <p className="text-gray-600 font-dm-sans mb-6">
            Explora nuestra academia y descubre cursos que transformarán tu vida
          </p>
          <Link
            href="/academia"
            className="inline-block bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Explorar Cursos
          </Link>
        </div>
      </div>
    )
  }

  // Fetch course details from Sanity
  const courseIds = userCourses.map((c) => c.courseId)
  const coursesData = await sanityFetch<any[]>({
    query: COURSES_BY_IDS_QUERY,
    params: { ids: courseIds },
  })

  // Merge Sanity data with progress data
  const coursesWithProgress = userCourses.map((userCourse) => {
    const sanityData = coursesData?.find((c: any) => c._id === userCourse.courseId)

    return {
      course: sanityData || {
        _id: userCourse.courseId,
        title: userCourse.courseTitle || 'Curso',
        slug: { current: userCourse.courseSlug || userCourse.courseId },
      },
      progress: {
        completionPercentage: Number(userCourse.completionPercentage) || 0,
        completedLessons: 0,
        lastAccessedAt: userCourse.lastAccessedAt?.toISOString(),
      },
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-gazeta text-3xl text-[#654177]">Mis Cursos</h1>
        <Link
          href="/academia"
          className="text-sm text-[#4944a4] hover:underline font-dm-sans"
        >
          Explorar más cursos
        </Link>
      </div>

      <MisCursosClient courses={coursesWithProgress} />
    </div>
  )
}
