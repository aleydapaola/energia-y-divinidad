"use client"

import { Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { UserMenu } from "@/components/auth/UserMenu"
import { CartButton, CartDrawer } from "@/components/cart"
import { features } from "@/lib/config/features"

interface HeaderProps {
  session: any
}

export function Header({ session }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: "Inicio", href: "/" },
    { label: "Sobre mí", href: "/sobre-mi" },
    ...(features.events ? [{ label: "Eventos", href: "/eventos" }] : []),
    { label: "Sesiones", href: "/sesiones" },
    { label: "Academia", href: "/academia" },
    { label: "Membresía", href: "/membresia" },
    { label: "Blog", href: "/blog" },
    { label: "Contacto", href: "/contacto" },
  ]

  return (
    <header className="bg-white border-b border-gray-200 relative">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center justify-between h-16">
          {/* Logo - Left Side */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/EnergiaDinividadHeading.png"
              alt="Energía y Divinidad - Canalización y Sanación Espiritual"
              width={200}
              height={50}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Navigation Menu - Center */}
          <nav className="flex-1 flex justify-center">
            <ul className="flex items-center gap-8">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-gray-700 hover:text-[#6B4C9A] transition-colors font-normal text-base"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right Side - WhatsApp, Cart and Login */}
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/573151165921"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
              aria-label="WhatsApp"
            >
              <svg className="w-6 h-6" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>

            <CartButton />

            {session ? (
              <UserMenu />
            ) : (
              <Link
                href="/auth/signin"
                className="px-6 py-2 border-2 border-[#6B4C9A] text-[#6B4C9A] rounded-full hover:bg-[#6B4C9A] hover:text-white transition-all font-medium text-sm"
              >
                Acceder
              </Link>
            )}
          </div>
        </div>


        {/* Mobile Navigation */}
        <div className="lg:hidden py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/EnergiaDinividadHeading.png"
                alt="Energía y Divinidad - Canalización y Sanación Espiritual"
                width={160}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <div className="flex items-center gap-3">
              <CartButton />
              {session && <UserMenu />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-[#6B4C9A]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 pb-4 border-t border-gray-200">
              <ul className="space-y-3 mt-4">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-gray-700 hover:text-[#6B4C9A] transition-colors font-normal"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {!session && (
                  <li>
                    <Link
                      href="/auth/signin"
                      className="block text-gray-700 hover:text-[#6B4C9A] transition-colors font-normal"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Acceder
                    </Link>
                  </li>
                )}
              </ul>

              {/* WhatsApp - Mobile */}
              <div className="mt-6">
                <a
                  href="https://wa.me/573151165921"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700"
                >
                  <svg className="w-6 h-6" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer />
    </header>
  )
}
