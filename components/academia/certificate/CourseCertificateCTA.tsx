'use client'

import { Award, Loader2, Check, FileText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface CourseCertificateCTAProps {
  courseId: string
  courseSlug: string
  completionPercentage: number
  hasCertificateTemplate: boolean
  requiresFinalQuiz: boolean
  finalQuizId?: string
  hasPassedFinalQuiz: boolean
  existingCertificate?: {
    id: string
    certificateNumber: string
  } | null
}

export function CourseCertificateCTA({
  courseId,
  courseSlug,
  completionPercentage,
  hasCertificateTemplate,
  requiresFinalQuiz,
  finalQuizId,
  hasPassedFinalQuiz,
  existingCertificate,
}: CourseCertificateCTAProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [certificate, setCertificate] = useState(existingCertificate)
  const [error, setError] = useState<string | null>(null)

  // If no certificate template, don't show anything
  if (!hasCertificateTemplate) {
    return null
  }

  // Calculate if eligible
  const isCompleted = completionPercentage >= 100
  const quizPassed = !requiresFinalQuiz || hasPassedFinalQuiz
  const canGetCertificate = isCompleted && quizPassed

  const handleGenerateCertificate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/certificates/generate/${courseId}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el certificado')
      }

      setCertificate({
        id: data.certificate.id,
        certificateNumber: data.certificate.certificateNumber,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsGenerating(false)
    }
  }

  // If already has certificate
  if (certificate) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-full">
            <Award className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-gazeta text-xl text-green-800 mb-1">
              ¡Certificado Obtenido!
            </h3>
            <p className="font-dm-sans text-green-700 text-sm mb-4">
              N° {certificate.certificateNumber}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/certificates/${certificate.id}/download`}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5" />
                Descargar PDF
              </a>
              <Link
                href={`/certificados/verificar/${certificate.certificateNumber}`}
                className="inline-flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-100 font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Verificar
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If can get certificate
  if (canGetCertificate) {
    return (
      <div className="bg-gradient-to-r from-[#8A4BAF]/10 to-[#4944a4]/10 border border-[#8A4BAF]/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#8A4BAF]/20 rounded-full">
            <Award className="h-8 w-8 text-[#8A4BAF]" />
          </div>
          <div className="flex-1">
            <h3 className="font-gazeta text-xl text-[#654177] mb-1">
              ¡Felicitaciones! Puedes obtener tu certificado
            </h3>
            <p className="font-dm-sans text-[#654177]/80 text-sm mb-4">
              Has completado todos los requisitos del curso.
            </p>
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleGenerateCertificate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Award className="h-5 w-5" />
                  Obtener Certificado
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show requirements
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-200 rounded-full">
          <Award className="h-8 w-8 text-gray-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-gazeta text-xl text-gray-800 mb-3">
            Certificado Disponible
          </h3>
          <p className="font-dm-sans text-gray-600 text-sm mb-4">
            Completa los siguientes requisitos para obtener tu certificado:
          </p>

          <ul className="space-y-2">
            <li
              className={`
                flex items-center gap-2 font-dm-sans text-sm
                ${isCompleted ? 'text-green-600' : 'text-gray-600'}
              `}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              Completar el curso al 100%
              {!isCompleted && (
                <span className="text-gray-400">
                  ({Math.round(completionPercentage)}% completado)
                </span>
              )}
            </li>

            {requiresFinalQuiz && finalQuizId && (
              <li
                className={`
                  flex items-center gap-2 font-dm-sans text-sm
                  ${hasPassedFinalQuiz ? 'text-green-600' : 'text-gray-600'}
                `}
              >
                {hasPassedFinalQuiz ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                Aprobar el examen final
                {!hasPassedFinalQuiz && isCompleted && (
                  <Link
                    href={`/academia/${courseSlug}/quiz/${finalQuizId}?courseId=${courseId}`}
                    className="text-[#4944a4] hover:underline ml-2"
                  >
                    Tomar examen →
                  </Link>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
