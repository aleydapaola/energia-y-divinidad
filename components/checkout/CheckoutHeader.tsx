'use client'

import { Lock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CheckoutHeaderProps {
  showSecureBadge?: boolean
}

export function CheckoutHeader({ showSecureBadge = true }: CheckoutHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Centered */}
          <div className="flex-1" />

          <Link href="/" className="flex items-center">
            <Image
              src="/images/EnergiaDinividadHeading.png"
              alt="Energía y Divinidad"
              width={180}
              height={45}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Secure Badge - Right */}
          <div className="flex-1 flex justify-end">
            {showSecureBadge && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Lock className="w-4 h-4" />
                <span className="font-dm-sans text-xs hidden sm:inline">Pago Seguro</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
