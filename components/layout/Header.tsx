"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { UserMenu } from "@/components/auth/UserMenu"
import { Menu, X } from "lucide-react"

interface HeaderProps {
  session: any
}

export function Header({ session }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [academyMenuOpen, setAcademyMenuOpen] = useState(false)

  const navItems = [
    { label: "INICIO", href: "/" },
    { label: "SESIONES", href: "/sesiones" },
    { label: "SOBRE MÍ", href: "/sobre-mi" },
    { label: "MEMBRESÍA", href: "/membresia" },
  ]

  const academyItems = [
    { label: "Aprende a canalizar", href: "/academia/aprende-a-canalizar" },
    { label: "Guías prácticas", href: "/academia/guias-practicas" },
    { label: "Cursos y Talleres", href: "/academia/cursos-y-talleres" },
  ]

  return (
    <header className="bg-header-gradient relative">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center justify-between py-6">
          {/* Left Menu */}
          <ul className="flex items-center gap-8">
            {navItems.slice(0, 2).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-primary hover:text-brand transition-colors font-medium text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Center Logo */}
          <Link href="/" className="flex flex-col items-center group">
            <Image
              src="/images/logo150x204marron.png"
              alt="Energía y Divinidad"
              width={75}
              height={102}
              className="mb-2 group-hover:scale-105 transition-transform"
            />
            <h1 className="font-paciencia text-brand text-[40px] leading-none tracking-wide">
              ENERGIA Y DIVINIDAD
            </h1>
          </Link>

          {/* Right Menu */}
          <ul className="flex items-center gap-8">
            {navItems.slice(2).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-primary hover:text-brand transition-colors font-medium text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Academia de Formación Dropdown */}
            <li className="relative">
              <button
                onClick={() => setAcademyMenuOpen(!academyMenuOpen)}
                onMouseEnter={() => setAcademyMenuOpen(true)}
                className="text-primary hover:text-brand transition-colors font-medium text-sm flex items-center gap-1"
              >
                ACADEMIA DE FORMACIÓN
                <svg
                  className={`w-4 h-4 transition-transform ${
                    academyMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {academyMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-2 z-50"
                  onMouseLeave={() => setAcademyMenuOpen(false)}
                >
                  {academyItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-primary hover:bg-gray-100 hover:text-brand transition-colors"
                      onClick={() => setAcademyMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          </ul>
        </nav>

        {/* Social Icons - Desktop */}
        <div className="hidden lg:flex justify-end gap-4 pb-4">
          <a
            href="https://instagram.com/energiaydivinidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand/80 transition-colors"
            aria-label="Instagram"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a
            href="https://facebook.com/energiaydivinidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand/80 transition-colors"
            aria-label="Facebook"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a
            href="https://youtube.com/@energiaydivinidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand/80 transition-colors"
            aria-label="YouTube"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a
            href="https://tiktok.com/@energiaydivinidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand/80 transition-colors"
            aria-label="TikTok"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          </a>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex flex-col items-center">
              <Image
                src="/images/logo150x204marron.png"
                alt="Energía y Divinidad"
                width={50}
                height={68}
                className="mb-1"
              />
              <h1 className="font-paciencia text-brand text-2xl leading-none">
                ENERGIA Y DIVINIDAD
              </h1>
            </Link>

            <div className="flex items-center gap-4">
              {session && <UserMenu />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-brand"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 pb-4 border-t border-primary/10">
              <ul className="space-y-3 mt-4">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-primary hover:text-brand transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => setAcademyMenuOpen(!academyMenuOpen)}
                    className="w-full text-left text-primary hover:text-brand transition-colors font-medium flex items-center justify-between"
                  >
                    ACADEMIA DE FORMACIÓN
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        academyMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {academyMenuOpen && (
                    <ul className="mt-2 ml-4 space-y-2">
                      {academyItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block text-sm text-primary hover:text-brand transition-colors"
                            onClick={() => {
                              setMobileMenuOpen(false)
                              setAcademyMenuOpen(false)
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                {!session && (
                  <li>
                    <Link
                      href="/auth/signin"
                      className="block text-primary hover:text-brand transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      INICIAR SESIÓN
                    </Link>
                  </li>
                )}
              </ul>

              {/* Social Icons - Mobile */}
              <div className="flex gap-4 mt-6">
                <a
                  href="https://instagram.com/energiaydivinidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand/80 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://facebook.com/energiaydivinidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand/80 transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@energiaydivinidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand/80 transition-colors"
                  aria-label="YouTube"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a
                  href="https://tiktok.com/@energiaydivinidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand/80 transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Menu - Desktop */}
      {session && (
        <div className="hidden lg:block absolute top-4 right-4">
          <UserMenu />
        </div>
      )}

      {!session && (
        <div className="hidden lg:block absolute top-4 right-4">
          <Link
            href="/auth/signin"
            className="text-sm text-primary hover:text-brand transition-colors font-medium"
          >
            Iniciar Sesión
          </Link>
        </div>
      )}
    </header>
  )
}
