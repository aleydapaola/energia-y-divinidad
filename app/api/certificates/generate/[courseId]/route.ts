import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { issueCertificate, canIssueCertificate } from '@/lib/certificates'
import { canAccessCourse } from '@/lib/course-access'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/certificates/generate/[courseId]
 * Genera un certificado para el usuario en un curso específico
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

    // Verify course access
    const accessResult = await canAccessCourse(session.user.id, courseId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 })
    }

    // Get user's name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Use name or email as student name
    const studentName = user.name || user.email?.split('@')[0] || 'Estudiante'

    // Check eligibility first
    const eligibility = await canIssueCertificate(session.user.id, courseId)

    if (!eligibility.canIssue) {
      const errorMessages: Record<string, string> = {
        already_issued: 'Ya tienes un certificado para este curso',
        course_not_completed: `Debes completar el curso al 100% para obtener el certificado. Progreso actual: ${eligibility.completionPercentage?.toFixed(0)}%`,
        final_quiz_not_passed: 'Debes aprobar el examen final para obtener el certificado',
        no_certificate_template: 'Este curso no tiene certificado disponible',
        course_not_found: 'Curso no encontrado',
      }

      return NextResponse.json(
        {
          error: errorMessages[eligibility.reason!] || 'No puedes obtener el certificado',
          reason: eligibility.reason,
          existingCertificate: eligibility.existingCertificate,
          completionPercentage: eligibility.completionPercentage,
        },
        { status: 400 }
      )
    }

    // Issue certificate
    const result = await issueCertificate({
      userId: session.user.id,
      courseId,
      studentName,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: result.certificate!.id,
        certificateNumber: result.certificate!.certificateNumber,
        courseName: result.certificate!.courseName,
        studentName: result.certificate!.studentName,
        issuedAt: result.certificate!.issuedAt,
        validUntil: result.certificate!.validUntil,
      },
    })
  } catch (error) {
    console.error('Error generating certificate:', error)
    return NextResponse.json({ error: 'Error al generar el certificado' }, { status: 500 })
  }
}

/**
 * GET /api/certificates/generate/[courseId]
 * Verifica si el usuario puede generar un certificado
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

    // Check eligibility
    const eligibility = await canIssueCertificate(session.user.id, courseId)

    return NextResponse.json({
      canIssue: eligibility.canIssue,
      reason: eligibility.reason,
      existingCertificate: eligibility.existingCertificate,
      completionPercentage: eligibility.completionPercentage,
      quizPassed: eligibility.quizPassed,
    })
  } catch (error) {
    console.error('Error checking certificate eligibility:', error)
    return NextResponse.json({ error: 'Error al verificar elegibilidad' }, { status: 500 })
  }
}
