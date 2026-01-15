'use client'

import { ShoppingCart, Check } from 'lucide-react'
import { useCartStore, type CartItem } from '@/lib/stores/cart-store'

interface AddToCartButtonProps {
  course: {
    _id: string
    title: string
    slug: { current: string }
    price: number
    priceUSD: number
    coverImage?: any
  }
  variant?: 'primary' | 'secondary'
  className?: string
}

export function AddToCartButton({
  course,
  variant = 'primary',
  className = '',
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem)
  const isInCart = useCartStore((state) => state.isInCart)
  const openCart = useCartStore((state) => state.openCart)

  const inCart = isInCart(course._id)

  const handleClick = () => {
    if (inCart) {
      openCart()
      return
    }

    const cartItem: CartItem = {
      id: course._id,
      title: course.title,
      slug: course.slug.current,
      price: course.price,
      priceUSD: course.priceUSD,
      coverImage: course.coverImage,
    }

    addItem(cartItem)
    openCart()
  }

  const baseStyles =
    'flex items-center justify-center gap-2 font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors'

  const variantStyles =
    variant === 'primary'
      ? inCart
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'bg-[#4944a4] hover:bg-[#3d3a8a] text-white'
      : inCart
        ? 'border-2 border-green-600 text-green-600 hover:bg-green-50'
        : 'border-2 border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white'

  return (
    <button onClick={handleClick} className={`${baseStyles} ${variantStyles} ${className}`}>
      {inCart ? (
        <>
          <Check className="h-5 w-5" />
          En el carrito
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          Añadir al carrito
        </>
      )}
    </button>
  )
}
