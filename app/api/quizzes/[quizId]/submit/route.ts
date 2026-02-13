import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { canAccessCourse, updateLessonProgress } from '@/lib/course-access'
import { submitQuizAttempt, hasPassedLessonQuiz } from '@/lib/quizzes'
import { client } from '@/sanity/lib/client'

/**
 * POST /api/quizzes/[quizId]/submit
 * Envía las respuestas de un quiz para calificación
 */
export async function POST(
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

    const body = await request.json()
    const { courseId, lessonId, answers, startedAt } = body

    if (!courseId) {
      return NextResponse.json({ error: 'ID del curso requerido' }, { status: 400 })
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Respuestas requeridas' }, { status: 400 })
    }

    if (!startedAt) {
      return NextResponse.json({ error: 'Hora de inicio requerida' }, { status: 400 })
    }

    // Verify course access
    const accessResult = await canAccessCourse(session.user.id, courseId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    // Submit quiz attempt
    const result = await submitQuizAttempt({
      userId: session.user.id,
      quizId,
      courseId,
      lessonId: lessonId || undefined,
      answers,
      startedAt: new Date(startedAt),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If this was a lesson quiz and user passed, mark lesson as completed
    if (lessonId && result.result?.passed) {
      // Check if lesson requires quiz to complete
      const lesson = await client.fetch(
        `*[_type == "courseLesson" && _id == $id][0] {
          requiresQuizToComplete
        }`,
        { id: lessonId }
      )

      if (lesson?.requiresQuizToComplete) {
        await updateLessonProgress({
          userId: session.user.id,
          courseId,
          lessonId,
          completed: true,
        })
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: result.attempt!.id,
        score: Number(result.attempt!.score),
        passed: result.attempt!.passed,
        totalPoints: result.attempt!.totalPoints,
        earnedPoints: result.attempt!.earnedPoints,
        timeSpent: result.attempt!.timeSpent,
        completedAt: result.attempt!.completedAt,
      },
      result: result.result,
    })
  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json({ error: 'Error al enviar el quiz' }, { status: 500 })
  }
}
