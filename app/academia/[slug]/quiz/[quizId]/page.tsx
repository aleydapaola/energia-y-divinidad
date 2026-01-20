import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { canAccessCourse } from '@/lib/course-access'
import { getQuizForAttempt, canTakeQuiz, hasPassedQuiz } from '@/lib/quizzes'
import { hasCertificate, canIssueCertificate } from '@/lib/certificates'
import { client } from '@/sanity/lib/client'
import { QuizPageClient } from './QuizPageClient'
import Link from 'next/link'
import { ChevronLeft, CheckCircle } from 'lucide-react'

interface QuizPageProps {
  params: Promise<{
    slug: string
    quizId: string
  }>
  searchParams: Promise<{
    courseId?: string
    lessonId?: string
  }>
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const session = await auth()
  const { slug, quizId } = await params
  const { courseId, lessonId } = await searchParams

  // Require authentication
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/academia/${slug}/quiz/${quizId}?courseId=${courseId}`)
  }

  // Get course ID if not provided
  let resolvedCourseId = courseId
  if (!resolvedCourseId) {
    const course = await client.fetch(
      `*[_type == "course" && slug.current == $slug][0] { _id }`,
      { slug }
    )
    if (!course) notFound()
    resolvedCourseId = course._id
  }

  // Ensure resolvedCourseId is defined
  if (!resolvedCourseId) {
    notFound()
  }

  // Verify course access
  const accessResult = await canAccessCourse(session.user.id, resolvedCourseId)
  if (!accessResult.hasAccess) {
    redirect(`/academia/${slug}?error=no_access`)
  }

  // Get quiz data
  const quiz = await getQuizForAttempt(quizId)
  if (!quiz) {
    notFound()
  }

  // Check if user can take the quiz
  const canTake = await canTakeQuiz(session.user.id, quizId)

  // Check if user already passed
  const hasPassed = await hasPassedQuiz(session.user.id, quizId)

  // Check if this is a final quiz and if user can get certificate
  const course = await client.fetch(
    `*[_type == "course" && _id == $id][0] {
      _id,
      title,
      "slug": slug.current,
      "finalQuizId": finalQuiz->._id,
      "hasCertificate": defined(certificate)
    }`,
    { id: resolvedCourseId }
  )

  const isFinalQuiz = course?.finalQuizId === quizId

  // Check certificate eligibility if this is the final quiz
  let showCertificateCTA = false
  let existingCertificate = null
  if (isFinalQuiz && course?.hasCertificate) {
    const certStatus = await hasCertificate(session.user.id, resolvedCourseId)
    existingCertificate = certStatus.has ? certStatus : null

    if (!certStatus.has) {
      const eligibility = await canIssueCertificate(session.user.id, resolvedCourseId)
      showCertificateCTA = eligibility.canIssue || (hasPassed && eligibility.reason === 'already_issued')
    }
  }

  // If user already passed and cannot retake
  if (hasPassed && !canTake.canTake) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Link
            href={`/academia/${course?.slug || slug}/reproducir`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al curso
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="font-gazeta text-2xl text-green-700 mb-2">
              Ya aprobaste este quiz
            </h1>
            <p className="font-dm-sans text-gray-600 mb-6">
              Has completado este quiz exitosamente.
              {canTake.maxAttempts && (
                <span className="block mt-2 text-sm">
                  Intentos usados: {canTake.attemptsUsed} de {canTake.maxAttempts}
                </span>
              )}
            </p>

            {showCertificateCTA && (
              <Link
                href={`/academia/${course?.slug || slug}/reproducir`}
                className="inline-flex items-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Ver certificado disponible
              </Link>
            )}

            {!showCertificateCTA && (
              <Link
                href={`/academia/${course?.slug || slug}/reproducir`}
                className="inline-flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Continuar con el curso
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href={`/academia/${course?.slug || slug}/reproducir${lessonId ? `?lesson=${lessonId}` : ''}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al curso
        </Link>

        <QuizPageClient
          quiz={quiz}
          courseId={resolvedCourseId}
          courseSlug={course?.slug || slug}
          lessonId={lessonId}
          canTake={canTake.canTake}
          canTakeReason={canTake.reason}
          attemptsUsed={canTake.attemptsUsed}
          maxAttempts={canTake.maxAttempts}
          nextAttemptAt={canTake.nextAttemptAt}
          showCertificateCTA={showCertificateCTA && isFinalQuiz}
        />
      </div>
    </div>
  )
}
