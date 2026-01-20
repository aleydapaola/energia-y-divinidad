import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canAccessCourse } from '@/lib/course-access'
import { getUserQuizAttempts, getQuizById } from '@/lib/quizzes'

/**
 * GET /api/quizzes/[quizId]/results
 * Obtiene los resultados de intentos anteriores de un quiz
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth()
    const { quizId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!quizId) {
      return NextResponse.json({ error: 'ID del quiz requerido' }, { status: 400 })
    }

    // Get courseId from query params
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'ID del curso requerido' }, { status: 400 })
    }

    // Verify course access
    const accessResult = await canAccessCourse(session.user.id, courseId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    // Get quiz info
    const quiz = await getQuizById(quizId)
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 })
    }

    // Get user's attempts
    const attempts = await getUserQuizAttempts(session.user.id, quizId)

    // Format attempts for response
    const formattedAttempts = attempts.map((attempt) => ({
      id: attempt.id,
      score: Number(attempt.score),
      passed: attempt.passed,
      totalPoints: attempt.totalPoints,
      earnedPoints: attempt.earnedPoints,
      timeSpent: attempt.timeSpent,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      // Include answers for review
      answers: attempt.answers,
    }))

    // Calculate statistics
    const passedAttempts = attempts.filter((a) => a.passed)
    const bestScore = attempts.length > 0
      ? Math.max(...attempts.map((a) => Number(a.score)))
      : 0

    return NextResponse.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        totalQuestions: quiz.questions.length,
      },
      attempts: formattedAttempts,
      statistics: {
        totalAttempts: attempts.length,
        passedAttempts: passedAttempts.length,
        bestScore,
        hasPassed: passedAttempts.length > 0,
        remainingAttempts: quiz.maxAttempts
          ? Math.max(0, quiz.maxAttempts - attempts.length)
          : null,
      },
    })
  } catch (error) {
    console.error('Error getting quiz results:', error)
    return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 })
  }
}
