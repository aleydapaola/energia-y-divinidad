'use client'

import { Award, Download, ExternalLink, Calendar, Clock } from 'lucide-react'
import Image from 'next/image'
import { urlForImage } from '@/sanity/lib/image'

interface CertificateCardProps {
  certificate: {
    id: string
    certificateNumber: string
    courseName: string
    courseId: string
    studentName: string
    issuedAt: string | Date
    validUntil?: string | Date | null
    courseHours?: number | null
    quizScore?: number | null
    courseImage?: any
  }
  onDownload?: () => void
}

export function CertificateCard({ certificate, onDownload }: CertificateCardProps) {
  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  }

  const isExpired = certificate.validUntil
    ? new Date(certificate.validUntil) < new Date()
    : false

  const handleDownload = async () => {
    if (onDownload) {
      onDownload()
    } else {
      // Default download behavior
      window.open(`/api/certificates/${certificate.id}/download`, '_blank')
    }
  }

  const verificationUrl = `/certificados/verificar/${certificate.certificateNumber}`

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border overflow-hidden
        ${isExpired ? 'border-gray-200 opacity-75' : 'border-[#8A4BAF]/20'}
      `}
    >
      {/* Course Image */}
      {certificate.courseImage && (
        <div className="relative h-32 bg-gray-100">
          <Image
            src={urlForImage(certificate.courseImage).width(400).height(200).url()}
            alt={certificate.courseName}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-gazeta text-white text-lg line-clamp-1">
              {certificate.courseName}
            </h3>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* If no image, show course name here */}
        {!certificate.courseImage && (
          <h3 className="font-gazeta text-[#654177] text-lg">
            {certificate.courseName}
          </h3>
        )}

        {/* Certificate badge */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#8A4BAF]/10 rounded-full">
            <Award className="h-5 w-5 text-[#8A4BAF]" />
          </div>
          <div>
            <p className="font-dm-sans text-sm text-gray-500">Certificado</p>
            <p className="font-dm-sans font-medium text-gray-800 text-xs">
              {certificate.certificateNumber}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm font-dm-sans">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Emitido: {formatDate(certificate.issuedAt)}</span>
          </div>

          {certificate.courseHours && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{certificate.courseHours} horas</span>
            </div>
          )}

          {certificate.quizScore !== null && certificate.quizScore !== undefined && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="inline-block w-4 h-4 text-center">✓</span>
              <span>Calificación: {Math.round(certificate.quizScore)}%</span>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 text-red-600">
              <span>⚠️ Certificado expirado</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleDownload}
            disabled={isExpired}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg
              font-dm-sans font-medium text-sm transition-colors
              ${
                isExpired
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#4944a4] hover:bg-[#3d3a8a] text-white'
              }
            `}
          >
            <Download className="h-4 w-4" />
            Descargar
          </button>

          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-300 hover:border-[#4944a4] text-gray-700 hover:text-[#4944a4] font-dm-sans font-medium text-sm transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Verificar
          </a>
        </div>
      </div>
    </div>
  )
}
