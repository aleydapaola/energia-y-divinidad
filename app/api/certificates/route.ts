import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserCertificates } from '@/lib/certificates'

/**
 * GET /api/certificates
 * Obtiene todos los certificados del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const certificates = await getUserCertificates(session.user.id)

    return NextResponse.json({
      certificates: certificates.map((cert) => ({
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        courseName: cert.courseName,
        courseId: cert.courseId,
        studentName: cert.studentName,
        issuedAt: cert.issuedAt,
        validUntil: cert.validUntil,
        courseHours: cert.courseHours,
        quizScore: cert.quizScore ? Number(cert.quizScore) : null,
        courseImage: cert.courseImage,
      })),
    })
  } catch (error) {
    console.error('Error getting certificates:', error)
    return NextResponse.json({ error: 'Error al obtener certificados' }, { status: 500 })
  }
}
