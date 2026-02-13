import { NextRequest, NextResponse } from 'next/server'

import { sendContactEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    // Validación básica
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Por favor completa todos los campos requeridos' },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor ingresa un email válido' },
        { status: 400 }
      )
    }

    // Mapear asuntos a textos legibles
    const subjectLabels: Record<string, string> = {
      sesiones: 'Sesiones de canalización',
      membresia: 'Membresía',
      academia: 'Academia / Cursos',
      eventos: 'Eventos y talleres',
      colaboracion: 'Colaboración / Prensa',
      otro: 'Otro',
    }

    const subjectLabel = subjectLabels[subject] || subject

    // Enviar el email
    const result = await sendContactEmail({
      name,
      email,
      phone,
      subject: subjectLabel,
      message,
    })

    if (!result.success) {
      console.error('Error sending contact email:', result.error)
      return NextResponse.json(
        { error: 'Error al enviar el mensaje. Por favor intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tu mensaje ha sido enviado correctamente',
    })
  } catch (error) {
    console.error('Error in contact API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
