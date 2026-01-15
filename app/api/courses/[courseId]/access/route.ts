import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canAccessCourse } from '@/lib/course-access'

/**
 * GET /api/courses/[courseId]/access
 * Verifica si el usuario tiene acceso a un curso
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    const { courseId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({
        hasAccess: false,
        reason: 'no_access',
        message: 'No autenticado',
      })
    }

    if (!courseId) {
      return NextResponse.json(
        { error: 'ID del curso requerido' },
        { status: 400 }
      )
    }

    const accessResult = await canAccessCourse(session.user.id, courseId)

    return NextResponse.json({
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      entitlement: accessResult.entitlement,
    })
  } catch (error) {
    console.error('Error checking course access:', error)
    return NextResponse.json(
      { error: 'Error al verificar acceso' },
      { status: 500 }
    )
  }
}
