'use client'

import { Loader2, CheckCircle, RefreshCw, Home, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

import { WompiManualPaymentInstructions } from '@/components/pago/WompiManualPaymentInstructions'

function WompiPendingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const reference = searchParams?.get('ref') || ''

  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'pending' | 'approved'>('pending')
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null)
  const [orderData, setOrderData] = useState<{
    orderNumber: string
    itemName: string
    amount: number
    currency: string
    paymentLinkUrl: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Load order data on mount
  useEffect(() => {
    const loadOrderData = async () => {
      if (!reference) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/orders/${reference}/status`)
        if (response.ok) {
          const data = await response.json()
          const metadata = data.metadata || {}

          setOrderData({
            orderNumber: data.orderNumber,
            itemName: data.itemName,
            amount: data.amount,
            currency: data.currency,
            paymentLinkUrl: metadata.wompiPaymentLinkUrl || '',
          })

          // Check if already paid
          if (data.paymentStatus === 'COMPLETED') {
            setStatus('approved')
            setTimeout(() => {
              router.push(`/pago/confirmacion?ref=${reference}`)
            }, 2000)
          }
        }
      } catch (err) {
        console.error('Error loading order:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrderData()
  }, [reference, router])

  const handleManualCheck = async () => {
    setChecking(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/orders/${reference}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.paymentStatus === 'COMPLETED') {
          setStatus('approved')
          setTimeout(() => {
            router.push(`/pago/confirmacion?ref=${reference}`)
          }, 2000)
        } else {
          // Show message that payment hasn't been confirmed yet
          setMessage({
            type: 'info',
            text: 'El pago aún no ha sido confirmado. Por favor espera mientras lo verificamos. Si ya realizaste el pago en Wompi, el proceso puede tomar unos minutos.',
          })
        }
      } else {
        setMessage({
          type: 'error',
          text: 'Error al verificar el estado del pago. Por favor intenta de nuevo.',
        })
      }
    } catch (err) {
      console.error('Error checking status:', err)
      setMessage({
        type: 'error',
        text: 'Error de conexión. Por favor verifica tu internet e intenta de nuevo.',
      })
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-[#f8f0f5] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="font-gazeta text-2xl text-[#654177] mb-4">
            Orden no encontrada
          </h1>
          <p className="font-dm-sans text-gray-600 mb-6">
            No pudimos encontrar los datos de tu orden. Por favor verifica el enlace o contacta soporte.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-[#f8f0f5] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="font-gazeta text-3xl text-[#654177] mb-4">
            ¡Pago Confirmado!
          </h1>
          <p className="font-dm-sans text-gray-600 mb-6">
            Tu pago con Wompi fue confirmado exitosamente.
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-dm-sans text-sm">Redirigiendo...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f0f5] py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Instrucciones de pago */}
        <WompiManualPaymentInstructions
          orderNumber={orderData.orderNumber}
          amount={orderData.amount}
          currency={orderData.currency}
          itemName={orderData.itemName}
          paymentLinkUrl={orderData.paymentLinkUrl}
        />

        {/* Acciones */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <p className="font-dm-sans text-center text-gray-600">
            ¿Ya realizaste el pago en Wompi?
          </p>

          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Ya realicé el pago
              </>
            )}
          </button>

          {/* Mensaje de estado */}
          {message && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <AlertCircle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  message.type === 'error' ? 'text-red-600' : 'text-blue-600'
                }`}
              />
              <p
                className={`font-dm-sans text-sm ${
                  message.type === 'error' ? 'text-red-700' : 'text-blue-700'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <Link
            href="/"
            className="w-full border border-gray-300 text-gray-700 font-dm-sans py-3 px-6 rounded-lg transition-colors hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function WompiPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      }
    >
      <WompiPendingContent />
    </Suspense>
  )
}
