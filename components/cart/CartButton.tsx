'use client'

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'

export function CartButton() {
  const items = useCartStore((state) => state.items)
  const openCart = useCartStore((state) => state.openCart)
  const itemCount = items.length

  return (
    <button
      onClick={openCart}
      className="relative p-2 text-gray-600 hover:text-[#8A4BAF] transition-colors"
      aria-label={`Carrito (${itemCount} items)`}
    >
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#4944a4] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  )
}
