import { Metadata } from 'next'
import { verifyCertificate } from '@/lib/certificates'
import { CheckCircle, XCircle, AlertTriangle, Award, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface VerifyPageProps {
  params: Promise<{
    number: string
  }>
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { number } = await params
  return {
    title: `Verificar Certificado ${number} | Energía y Divinidad`,
    description: 'Verifica la autenticidad de un certificado emitido por Energía y Divinidad',
  }
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { number: certificateNumber } = await params

  // Verify the certificate
  const result = await verifyCertificate(certificateNumber)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-rightland text-2xl text-[#8A4BAF]">
              Energía y Divinidad
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="font-gazeta text-3xl text-[#654177] mb-2">
            Verificación de Certificado
          </h1>
          <p className="font-dm-sans text-gray-600">
            Número: <strong>{certificateNumber}</strong>
          </p>
        </div>

        {/* Verification Result */}
        {result.valid ? (
          // Valid certificate
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Success banner */}
            <div className="bg-green-500 p-6 text-center">
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-3" />
              <h2 className="font-gazeta text-2xl text-white">
                Certificado Válido
              </h2>
              <p className="font-dm-sans text-green-100 mt-1">
                Este certificado es auténtico y ha sido verificado
              </p>
            </div>

            {/* Certificate details */}
            <div className="p-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#8A4BAF]/10 rounded-full mb-4">
                  <Award className="h-10 w-10 text-[#8A4BAF]" />
                </div>
                <h3 className="font-gazeta text-xl text-[#654177]">
                  Certificado de Completación
                </h3>
              </div>

              <div className="border-t border-b border-gray-100 py-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-dm-sans text-gray-500">Otorgado a:</span>
                  <span className="font-dm-sans font-semibold text-gray-800">
                    {result.certificate!.studentName}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-dm-sans text-gray-500">Curso:</span>
                  <span className="font-dm-sans font-semibold text-gray-800">
                    {result.certificate!.courseName}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-dm-sans text-gray-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de emisión:
                  </span>
                  <span className="font-dm-sans text-gray-800">
                    {formatDate(result.certificate!.issuedAt)}
                  </span>
                </div>

                {result.certificate!.courseHours && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-500 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duración del curso:
                    </span>
                    <span className="font-dm-sans text-gray-800">
                      {result.certificate!.courseHours} horas
                    </span>
                  </div>
                )}

                {result.certificate!.validUntil && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-500">Válido hasta:</span>
                    <span className="font-dm-sans text-gray-800">
                      {formatDate(result.certificate!.validUntil)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-center font-dm-sans text-sm text-gray-500">
                Verificado el {formatDate(new Date())}
              </p>
            </div>
          </div>
        ) : result.expired ? (
          // Expired certificate
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-amber-500 p-6 text-center">
              <AlertTriangle className="h-16 w-16 text-white mx-auto mb-3" />
              <h2 className="font-gazeta text-2xl text-white">
                Certificado Expirado
              </h2>
              <p className="font-dm-sans text-amber-100 mt-1">
                Este certificado ya no es válido
              </p>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-dm-sans text-gray-500">Otorgado a:</span>
                <span className="font-dm-sans font-semibold text-gray-800">
                  {result.certificate!.studentName}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-dm-sans text-gray-500">Curso:</span>
                <span className="font-dm-sans font-semibold text-gray-800">
                  {result.certificate!.courseName}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-dm-sans text-gray-500">Fecha de emisión:</span>
                <span className="font-dm-sans text-gray-800">
                  {formatDate(result.certificate!.issuedAt)}
                </span>
              </div>

              <div className="flex justify-between items-center text-red-600">
                <span className="font-dm-sans">Expiró el:</span>
                <span className="font-dm-sans font-semibold">
                  {formatDate(result.certificate!.validUntil!)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Not found
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-red-500 p-6 text-center">
              <XCircle className="h-16 w-16 text-white mx-auto mb-3" />
              <h2 className="font-gazeta text-2xl text-white">
                Certificado No Encontrado
              </h2>
              <p className="font-dm-sans text-red-100 mt-1">
                No pudimos verificar este número de certificado
              </p>
            </div>

            <div className="p-8 text-center">
              <p className="font-dm-sans text-gray-600 mb-6">
                El número de certificado <strong>{certificateNumber}</strong> no existe
                en nuestros registros. Por favor verifica que el número sea correcto.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
                <p>Si crees que esto es un error, por favor contacta a:</p>
                <a
                  href="mailto:soporte@energiaydivinidad.com"
                  className="text-[#4944a4] hover:underline"
                >
                  soporte@energiaydivinidad.com
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="font-dm-sans text-sm text-gray-500">
            Los certificados de Energía y Divinidad son emitidos digitalmente
            y pueden ser verificados en esta página usando el número único de certificado.
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4944a4] hover:text-[#3d3a8a] font-dm-sans font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
