'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, Play } from 'lucide-react'
import { useCartStore, type CartItem } from '@/lib/stores/cart-store'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

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
  const { data: session } = useSession()
  const addItem = useCartStore((state) => state.addItem)
  const isInCart = useCartStore((state) => state.isInCart)
  const openCart = useCartStore((state) => state.openCart)
  const removeItem = useCartStore((state) => state.removeItem)

  const [isOwned, setIsOwned] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const inCart = isInCart(course._id)

  // Verificar si el usuario ya posee el curso
  useEffect(() => {
    async function checkOwnership() {
      if (!session?.user) {
        setIsOwned(false)
        return
      }

      setIsChecking(true)
      try {
        const response = await fetch(`/api/courses/${course._id}/access`)
        if (response.ok) {
          const data = await response.json()
          setIsOwned(data.hasAccess)

          // Si ya posee el curso y está en el carrito, quitarlo
          if (data.hasAccess && inCart) {
            removeItem(course._id)
          }
        }
      } catch (error) {
        console.error('Error checking course ownership:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkOwnership()
  }, [session?.user, course._id, inCart, removeItem])

  const handleClick = () => {
    // Si ya posee el curso, no hacer nada
    if (isOwned) return

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

  // Estilos según estado
  const getVariantStyles = () => {
    if (isOwned) {
      return variant === 'primary'
        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
        : 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
    }
    if (inCart) {
      return variant === 'primary'
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'border-2 border-green-600 text-green-600 hover:bg-green-50'
    }
    return variant === 'primary'
      ? 'bg-[#4944a4] hover:bg-[#3d3a8a] text-white'
      : 'border-2 border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white'
  }

  // Mientras verifica, mostrar el estado normal pero deshabilitado
  if (isChecking) {
    return (
      <button
        disabled
        className={`${baseStyles} bg-gray-300 text-gray-500 cursor-wait ${className}`}
      >
        <ShoppingCart className="h-5 w-5" />
        Cargando...
      </button>
    )
  }

  // Si ya posee el curso, mostrar enlace para ir al contenido
  if (isOwned) {
    return (
      <Link
        href={`/academia/${course.slug.current}/reproducir`}
        className={`${baseStyles} ${getVariantStyles()} ${className}`}
      >
        <Play className="h-5 w-5" />
        Ir al curso
      </Link>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${getVariantStyles()} ${className}`}
    >
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
