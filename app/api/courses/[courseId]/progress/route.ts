import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { canAccessCourse, updateLessonProgress, getLessonProgress } from '@/lib/course-access'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/courses/[courseId]/progress
 * Obtiene el progreso del usuario en un curso
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    const { courseId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!courseId) {
      return NextResponse.json({ error: 'ID del curso requerido' }, { status: 400 })
    }

    // Verificar acceso
    const accessResult = await canAccessCourse(session.user.id, courseId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    // Obtener progreso del curso
    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    // Obtener progreso de lecciones
    const lessonProgressMap = await getLessonProgress(session.user.id, courseId)
    const lessonProgress = Object.fromEntries(lessonProgressMap)

    return NextResponse.json({
      courseProgress: courseProgress
        ? {
            completionPercentage: Number(courseProgress.completionPercentage),
            startedAt: courseProgress.startedAt,
            lastAccessedAt: courseProgress.lastAccessedAt,
            completedAt: courseProgress.completedAt,
          }
        : null,
      lessonProgress,
    })
  } catch (error) {
    console.error('Error getting course progress:', error)
    return NextResponse.json({ error: 'Error al obtener progreso' }, { status: 500 })
  }
}

/**
 * POST /api/courses/[courseId]/progress
 * Actualiza el progreso de una lección
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    const { courseId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!courseId) {
      return NextResponse.json({ error: 'ID del curso requerido' }, { status: 400 })
    }

    // Verificar acceso
    const accessResult = await canAccessCourse(session.user.id, courseId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    const body = await request.json()
    const { lessonId, watchedSeconds, lastPosition, completed } = body

    if (!lessonId) {
      return NextResponse.json({ error: 'ID de la lección requerido' }, { status: 400 })
    }

    // Actualizar progreso
    await updateLessonProgress({
      userId: session.user.id,
      courseId,
      lessonId,
      watchedSeconds,
      lastPosition,
      completed,
    })

    // Obtener progreso actualizado del curso
    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      courseProgress: courseProgress
        ? {
            completionPercentage: Number(courseProgress.completionPercentage),
            completedAt: courseProgress.completedAt,
          }
        : null,
    })
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return NextResponse.json({ error: 'Error al actualizar progreso' }, { status: 500 })
  }
}
