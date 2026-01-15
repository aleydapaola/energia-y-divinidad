'use client'

import { useState, useEffect } from 'react'
import { CourseCatalog } from '@/components/academia'
import { useCartStore } from '@/lib/stores/cart-store'

interface Course {
  _id: string
  title: string
  slug: { current: string }
  shortDescription?: string
  coverImage?: any
  price: number
  priceUSD: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  totalDuration?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  courseType: 'simple' | 'modular'
  topics?: string[]
  instructor?: string
  featured?: boolean
}

interface AcademiaPageClientProps {
  courses: Course[]
}

export function AcademiaPageClient({ courses }: AcademiaPageClientProps) {
  const currency = useCartStore((state) => state.currency)
  const setCurrency = useCartStore((state) => state.setCurrency)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="bg-white rounded-xl h-16 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-96" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Currency Toggle */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setCurrency('COP')}
            className={`px-4 py-2 rounded-md font-dm-sans text-sm font-medium transition-colors ${
              currency === 'COP'
                ? 'bg-[#4944a4] text-white'
                : 'text-gray-600 hover:text-[#4944a4]'
            }`}
          >
            COP
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-4 py-2 rounded-md font-dm-sans text-sm font-medium transition-colors ${
              currency === 'USD'
                ? 'bg-[#4944a4] text-white'
                : 'text-gray-600 hover:text-[#4944a4]'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      <CourseCatalog courses={courses} currency={currency} />
    </div>
  )
}
