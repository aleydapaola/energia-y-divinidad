'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { SanityDiscountCode } from '@/lib/discount-codes'

// Types
export interface CartItem {
  id: string // Sanity course _id
  title: string
  slug: string
  price: number // COP price
  priceUSD: number // USD price
  coverImage?: {
    asset: { _ref: string }
    alt?: string
  }
}

export interface AppliedDiscount {
  code: string
  discountCodeId: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  discountAmount: number // Calculated amount saved
  currency?: string
}

interface CartState {
  items: CartItem[]
  discount: AppliedDiscount | null
  isOpen: boolean
  currency: 'COP' | 'USD'

  // Actions
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  isInCart: (id: string) => boolean
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  setCurrency: (currency: 'COP' | 'USD') => void
  applyDiscount: (discount: AppliedDiscount) => void
  removeDiscount: () => void

  // Computed (as functions since Zustand doesn't have native computed)
  getItemCount: () => number
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: null,
      isOpen: false,
      currency: 'COP',

      addItem: (item) => {
        const { items } = get()
        // Don't add if already in cart
        if (items.some((i) => i.id === item.id)) {
          return
        }
        set({ items: [...items, item] })
      },

      removeItem: (id) => {
        const { items, discount } = get()
        const newItems = items.filter((i) => i.id !== id)
        set({ items: newItems })

        // Clear discount if cart becomes empty
        if (newItems.length === 0 && discount) {
          set({ discount: null })
        }
      },

      clearCart: () => {
        set({ items: [], discount: null })
      },

      isInCart: (id) => {
        return get().items.some((i) => i.id === id)
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      setCurrency: (currency) => {
        set({ currency, discount: null }) // Clear discount when changing currency
      },

      applyDiscount: (discount) => {
        set({ discount })
      },

      removeDiscount: () => {
        set({ discount: null })
      },

      getItemCount: () => {
        return get().items.length
      },

      getSubtotal: () => {
        const { items, currency } = get()
        return items.reduce((sum, item) => {
          const price = currency === 'COP' ? item.price : item.priceUSD
          return sum + (price || 0)
        }, 0)
      },

      getDiscountAmount: () => {
        const { discount } = get()
        if (!discount) {return 0}
        return discount.discountAmount
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const discountAmount = get().getDiscountAmount()
        return Math.max(0, subtotal - discountAmount)
      },
    }),
    {
      name: 'academia-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
        currency: state.currency,
      }),
    }
  )
)

// Helper hook to get cart summary
export function useCartSummary() {
  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const currency = useCartStore((state) => state.currency)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount)
  const getTotal = useCartStore((state) => state.getTotal)

  return {
    itemCount: items.length,
    subtotal: getSubtotal(),
    discountAmount: getDiscountAmount(),
    total: getTotal(),
    discount,
    currency,
    isEmpty: items.length === 0,
    isFree: getTotal() === 0 && items.length > 0,
  }
}

// Format price helper
export function formatPrice(amount: number, currency: 'COP' | 'USD'): string {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
