import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { canAccessCourse } from '@/lib/course-access'
import {
  getQuizForAttempt,
  canTakeQuiz,
  getUserQuizAttempts,
} from '@/lib/quizzes'
import { client } from '@/sanity/lib/client'

/**
 * GET /api/quizzes/[quizId]
 * Obtiene un quiz para tomar (sin respuestas correctas)
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

    // Get courseId from query params (required for access check)
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

    // Check if user can take the quiz
    const canTake = await canTakeQuiz(session.user.id, quizId)

    // Get previous attempts
    const attempts = await getUserQuizAttempts(session.user.id, quizId)
    const bestAttempt = attempts.length > 0
      ? attempts.reduce((best, current) =>
          Number(current.score) > Number(best.score) ? current : best
        )
      : null

    // Get quiz for attempt (shuffled if configured)
    const quiz = await getQuizForAttempt(quizId)

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      quiz,
      canTake: canTake.canTake,
      canTakeReason: canTake.reason,
      attemptsUsed: canTake.attemptsUsed,
      maxAttempts: canTake.maxAttempts,
      nextAttemptAt: canTake.nextAttemptAt,
      bestAttempt: bestAttempt
        ? {
            id: bestAttempt.id,
            score: Number(bestAttempt.score),
            passed: bestAttempt.passed,
            completedAt: bestAttempt.completedAt,
          }
        : null,
      hasPassedBefore: attempts.some((a) => a.passed),
    })
  } catch (error) {
    console.error('Error getting quiz:', error)
    return NextResponse.json({ error: 'Error al obtener el quiz' }, { status: 500 })
  }
}
