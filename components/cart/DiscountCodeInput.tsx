'use client'

import { useState } from 'react'
import { Tag, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { useCartStore, useCartSummary } from '@/lib/stores/cart-store'

export function DiscountCodeInput() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = useCartStore((state) => state.items)
  const applyDiscount = useCartStore((state) => state.applyDiscount)
  const removeDiscount = useCartStore((state) => state.removeDiscount)
  const { discount, subtotal, currency } = useCartSummary()

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Ingresa un código de descuento')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          courseIds: items.map((item) => item.id),
          amount: subtotal,
          currency,
        }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError(data.error || 'Código no válido')
        return
      }

      // Aplicar el descuento al store
      applyDiscount({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
        discountCodeId: data.discountCodeId,
      })

      setCode('')
    } catch (err) {
      setError('Error al validar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    removeDiscount()
    setCode('')
    setError(null)
  }

  // Si ya hay un descuento aplicado, mostrar el código activo
  if (discount) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="font-dm-sans text-sm text-green-800">
              Código <strong>{discount.code}</strong> aplicado
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 p-1"
            aria-label="Eliminar código"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-green-600 mt-1 font-dm-sans">
          {discount.discountType === 'percentage'
            ? `${discount.discountValue}% de descuento`
            : `Descuento de ${currency === 'COP' ? '$' : 'US$'}${discount.discountValue.toLocaleString()}`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Código de descuento"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:ring-2 focus:ring-[#4944a4] focus:border-transparent uppercase"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only">Validando</span>
            </>
          ) : (
            'Aplicar'
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm font-dm-sans">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
