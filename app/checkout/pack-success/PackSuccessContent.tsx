'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Copy, Check, Sparkles, Calendar } from 'lucide-react'

interface PackCodeData {
  code: string
  expiresAt: string
  sessionsTotal: number
  amount: number
  currency: string
}

export default function PackSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [packData, setPackData] = useState<PackCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchPackCode() {
      if (!sessionId) {
        setError('No se encontró la sesión de pago')
        setLoading(false)
        return
      }

      try {
        // Obtener datos del pack code asociado a este booking
        const response = await fetch(`/api/checkout/pack-code?session_id=${sessionId}`)

        if (!response.ok) {
          throw new Error('No se pudo obtener el código del pack')
        }

        const data = await response.json()
        setPackData(data)
      } catch (err) {
        console.error('Error fetching pack code:', err)
        setError('Hubo un problema al obtener tu código. Por favor revisa tu email o contacta soporte.')
      } finally {
        setLoading(false)
      }
    }

    fetchPackCode()
  }, [sessionId])

  const handleCopyCode = async () => {
    if (!packData?.code) return

    try {
      await navigator.clipboard.writeText(packData.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying code:', err)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'COP') {
      return `$${amount.toLocaleString('es-CO')} COP`
    } else if (currency === 'EUR') {
      return `€${amount.toLocaleString('es-ES')} EUR`
    }
    return `$${amount.toLocaleString('en-US')} USD`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A4BAF] mx-auto mb-4"></div>
          <p className="text-[#654177]">
            Procesando tu compra...
          </p>
        </div>
      </div>
    )
  }

  if (error || !packData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5] px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-gazeta text-[#654177] mb-4">
            ¡Tu pago fue exitoso!
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Tu código de pack ha sido enviado a tu email. También puedes encontrarlo en tu cuenta.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/sesiones"
              className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Ir a Sesiones
            </Link>
            <Link
              href="/mi-cuenta"
              className="w-full border border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Ver mi cuenta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5] px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-[#8A4BAF] to-[#654177] p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-gazeta mb-2">
            ¡Tu Pack está Listo!
          </h1>
          <p className="text-white/80">
            Guarda este código para reservar tus sesiones
          </p>
        </div>

        <div className="p-8">
          {/* Código destacado */}
          <div className="bg-gradient-to-r from-[#8A4BAF] to-[#654177] rounded-xl p-6 mb-6">
            <p className="text-white/70 text-sm text-center mb-2 uppercase tracking-wider">
              Tu código
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-[0.2em]">
                {packData.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Copiar código"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-300" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-green-300 text-sm text-center mt-2">
                ¡Código copiado!
              </p>
            )}
          </div>

          {/* Detalles del pack */}
          <div className="bg-[#f8f0f5] rounded-xl p-6 mb-6">
            <h2 className="font-gazeta text-lg text-[#654177] mb-4">
              Detalles del Pack
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[#8A4BAF]/10">
                <span className="text-gray-600">Sesiones incluidas</span>
                <span className="font-semibold text-[#654177]">{packData.sessionsTotal} sesiones</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#8A4BAF]/10">
                <span className="text-gray-600">Total pagado</span>
                <span className="font-semibold text-[#654177]">{formatAmount(packData.amount, packData.currency)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Válido hasta</span>
                <span className="font-semibold text-[#654177]">{formatDate(packData.expiresAt)}</span>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="mb-8">
            <h2 className="font-gazeta text-lg text-[#654177] mb-4">
              ¿Cómo usar tu código?
            </h2>
            <ol className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                <span>Ve a la página de <strong className="text-[#654177]">Sesiones</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                <span>Haz clic en <strong className="text-[#654177]">&quot;¿Tienes un código?&quot;</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                <span>Ingresa tu código: <strong className="text-[#654177] font-mono">{packData.code}</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-sm font-semibold">4</span>
                <span>Selecciona la fecha y hora que prefieras</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#8A4BAF] text-white rounded-full flex items-center justify-center text-sm font-semibold">5</span>
                <span>¡Listo! Tu sesión quedará reservada</span>
              </li>
            </ol>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/sesiones"
              className="flex-1 flex items-center justify-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Agendar mi primera sesión
            </Link>
            <Link
              href="/mi-cuenta"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              Ver mis packs
            </Link>
          </div>

          {/* Nota sobre email */}
          <p className="text-center text-sm text-gray-500 mt-6">
            También te enviamos el código a tu email de confirmación.
          </p>
        </div>
      </div>
    </div>
  )
}
