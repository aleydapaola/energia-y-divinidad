import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCertificateData } from '@/lib/certificates'
import { generateCertificatePdfBuffer } from '@/lib/certificate-pdf'

/**
 * GET /api/certificates/[certificateId]/download
 * Descarga el PDF de un certificado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const session = await auth()
    const { certificateId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!certificateId) {
      return NextResponse.json({ error: 'ID del certificado requerido' }, { status: 400 })
    }

    // Get certificate data (verifies ownership via userId)
    const certificateData = await getCertificateData(certificateId, session.user.id)

    if (!certificateData) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePdfBuffer(certificateData)

    // Create filename
    const sanitizedCourseName = certificateData.courseName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30)
    const filename = `Certificado_${sanitizedCourseName}_${certificateData.certificateNumber}.pdf`

    // Return PDF response - convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error downloading certificate:', error)
    return NextResponse.json({ error: 'Error al descargar el certificado' }, { status: 500 })
  }
}
