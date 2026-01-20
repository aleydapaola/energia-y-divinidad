'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface CertificateDownloadButtonProps {
  certificateId: string
  courseName?: string
  className?: string
  variant?: 'primary' | 'secondary'
}

export function CertificateDownloadButton({
  certificateId,
  courseName,
  className = '',
  variant = 'primary',
}: CertificateDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)

    try {
      const response = await fetch(`/api/certificates/${certificateId}/download`)

      if (!response.ok) {
        throw new Error('Error al descargar el certificado')
      }

      // Get the blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'Certificado.pdf'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      } else if (courseName) {
        filename = `Certificado_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      alert('Error al descargar el certificado. Por favor intenta de nuevo.')
    } finally {
      setIsDownloading(false)
    }
  }

  const baseClasses =
    'flex items-center justify-center gap-2 font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors'

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#4944a4] hover:bg-[#3d3a8a] text-white'
      : 'border-2 border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white'

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`${baseClasses} ${variantClasses} ${className} ${isDownloading ? 'opacity-75 cursor-wait' : ''}`}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Descargando...
        </>
      ) : (
        <>
          <Download className="h-5 w-5" />
          Descargar Certificado
        </>
      )}
    </button>
  )
}
