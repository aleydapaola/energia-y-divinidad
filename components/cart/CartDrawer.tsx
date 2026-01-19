'use client'

import { Fragment, useEffect, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, ShoppingCart, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore, useCartSummary, formatPrice } from '@/lib/stores/cart-store'
import { urlFor } from '@/sanity/lib/image'
import { useSession } from 'next-auth/react'

export function CartDrawer() {
  const { data: session } = useSession()
  const items = useCartStore((state) => state.items)
  const isOpen = useCartStore((state) => state.isOpen)
  const closeCart = useCartStore((state) => state.closeCart)
  const removeItem = useCartStore((state) => state.removeItem)
  const { subtotal, discountAmount, total, currency, isEmpty, discount } = useCartSummary()

  // Ref para evitar verificaciones repetidas en la misma apertura
  const hasCheckedRef = useRef(false)
  const lastOpenRef = useRef(false)

  // Verificar y eliminar cursos ya comprados cuando se abre el carrito
  useEffect(() => {
    // Reset check flag cuando el carrito se cierra
    if (!isOpen && lastOpenRef.current) {
      hasCheckedRef.current = false
    }
    lastOpenRef.current = isOpen

    // Solo verificar cuando se abre, hay usuario y no hemos verificado aún
    if (!isOpen || !session?.user || items.length === 0 || hasCheckedRef.current) {
      return
    }

    hasCheckedRef.current = true

    const checkOwnedCourses = async () => {
      // Copiar IDs para evitar problemas con el estado cambiante
      const itemIds = items.map((item) => ({ id: item.id, title: item.title }))

      for (const { id, title } of itemIds) {
        try {
          const response = await fetch(`/api/courses/${id}/access`)
          if (response.ok) {
            const data = await response.json()
            if (data.hasAccess) {
              removeItem(id)
              console.log(`[CART] Removed owned course: ${title}`)
            }
          }
        } catch (error) {
          console.error('Error checking course ownership:', error)
        }
      }
    }

    checkOwnedCourses()
  }, [isOpen, session?.user, items, removeItem])

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeCart}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
                      <Dialog.Title className="flex items-center gap-2 font-gazeta text-xl text-[#654177]">
                        <ShoppingCart className="h-5 w-5" />
                        Tu Carrito
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={closeCart}
                      >
                        <span className="sr-only">Cerrar</span>
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {isEmpty ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-gray-500 font-dm-sans">
                            Tu carrito está vacío
                          </p>
                          <Link
                            href="/academia"
                            onClick={closeCart}
                            className="mt-4 text-[#4944a4] hover:underline font-dm-sans"
                          >
                            Explorar cursos
                          </Link>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {items.map((item) => (
                            <li key={item.id} className="flex py-4">
                              {/* Image */}
                              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {item.coverImage ? (
                                  <Image
                                    src={urlFor(item.coverImage).width(160).height(160).url()}
                                    alt={item.title}
                                    width={80}
                                    height={80}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <span className="text-2xl">📚</span>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="ml-4 flex flex-1 flex-col">
                                <div className="flex justify-between">
                                  <h3 className="font-dm-sans font-medium text-gray-900 text-sm line-clamp-2">
                                    {item.title}
                                  </h3>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    aria-label="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="mt-1 text-[#4944a4] font-dm-sans font-semibold">
                                  {formatPrice(
                                    currency === 'COP' ? item.price : item.priceUSD,
                                    currency
                                  )}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Footer */}
                    {!isEmpty && (
                      <div className="border-t border-gray-200 px-4 py-6">
                        {/* Discount */}
                        {discount && (
                          <div className="flex justify-between text-sm text-green-600 mb-2">
                            <span>Descuento ({discount.code})</span>
                            <span>-{formatPrice(discountAmount, currency)}</span>
                          </div>
                        )}

                        {/* Subtotal */}
                        {discount && (
                          <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal, currency)}</span>
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between text-lg font-semibold text-gray-900 mb-6">
                          <span>Total</span>
                          <span className="text-[#4944a4]">
                            {total === 0 ? 'Gratis' : formatPrice(total, currency)}
                          </span>
                        </div>

                        {/* Checkout Button */}
                        <Link
                          href="/academia/checkout"
                          onClick={closeCart}
                          className="w-full block text-center bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                          {total === 0 ? 'Obtener Gratis' : 'Ir al Checkout'}
                        </Link>

                        {/* Continue Shopping */}
                        <Link
                          href="/academia"
                          onClick={closeCart}
                          className="mt-3 w-full block text-center text-[#4944a4] hover:underline font-dm-sans text-sm"
                        >
                          Seguir explorando
                        </Link>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
