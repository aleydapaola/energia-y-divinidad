'use client'

import { useEffect, useState } from 'react'
import { Coins, Clock, History, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface CreditBalance {
  available: number
  pending: number
  total: number
  nextExpiration?: {
    date: string
    amount: number
  }
}

export function CreditsCard() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance)
        } else if (response.status !== 401) {
          // Ignore 401 (not authenticated)
          setError('Error al cargar créditos')
        }
      } catch (err) {
        console.error('Error fetching credits:', err)
        setError('Error al cargar créditos')
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded w-40" />
        </div>
        <div className="h-12 bg-gray-200 rounded w-24" />
      </div>
    )
  }

  // Don't show card if no credits or error
  if (error || !balance || balance.total === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="bg-gradient-to-br from-[#8A4BAF]/10 to-[#654177]/10 rounded-xl border border-[#8A4BAF]/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#8A4BAF]" />
          Créditos de Sesión
        </h2>
        <Link
          href="/mi-cuenta/creditos"
          className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center gap-1"
        >
          <History className="w-4 h-4" />
          Historial
        </Link>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold text-[#8A4BAF] font-dm-sans">
          {balance.available}
        </span>
        <span className="text-gray-500 font-dm-sans">
          {balance.available === 1 ? 'crédito disponible' : 'créditos disponibles'}
        </span>
      </div>

      {balance.nextExpiration && balance.pending > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700 font-dm-sans">
            {balance.pending} {balance.pending === 1 ? 'crédito expira' : 'créditos expiran'} el{' '}
            {formatDate(balance.nextExpiration.date)}
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-[#8A4BAF]/20">
        <Link
          href="/sesiones"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4944a4] text-white rounded-lg font-dm-sans text-sm hover:bg-[#3d3a8a] transition-colors"
        >
          Usar crédito en una sesión
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
