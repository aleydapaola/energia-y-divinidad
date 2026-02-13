import { NextRequest, NextResponse } from 'next/server'

import { verifyCertificate } from '@/lib/certificates'

/**
 * GET /api/certificates/verify/[number]
 * Verifica la autenticidad de un certificado (endpoint público)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number: certificateNumber } = await params

    if (!certificateNumber) {
      return NextResponse.json({ error: 'Número de certificado requerido' }, { status: 400 })
    }

    // Verify certificate
    const result = await verifyCertificate(certificateNumber)

    if (!result.certificate) {
      return NextResponse.json({
        valid: false,
        message: 'Certificado no encontrado. Verifica que el número sea correcto.',
      })
    }

    if (result.expired) {
      return NextResponse.json({
        valid: false,
        expired: true,
        message: 'Este certificado ha expirado.',
        certificate: {
          studentName: result.certificate.studentName,
          courseName: result.certificate.courseName,
          issuedAt: result.certificate.issuedAt,
          validUntil: result.certificate.validUntil,
        },
      })
    }

    return NextResponse.json({
      valid: true,
      message: 'Certificado válido y verificado.',
      certificate: {
        studentName: result.certificate.studentName,
        courseName: result.certificate.courseName,
        issuedAt: result.certificate.issuedAt,
        validUntil: result.certificate.validUntil,
        courseHours: result.certificate.courseHours,
      },
    })
  } catch (error) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json({ error: 'Error al verificar el certificado' }, { status: 500 })
  }
}
