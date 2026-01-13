"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { User, LogOut, ChevronLeft } from "lucide-react"

interface DashboardHeaderProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Back to home + Logo */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-500 hover:text-[#8A4BAF] transition-colors font-dm-sans text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Inicio
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <Link href="/" className="font-rightland text-2xl text-[#8A4BAF]">
              Energía y Divinidad
            </Link>
          </div>

          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "Usuario"}
                  className="w-10 h-10 rounded-full border-2 border-[#8A4BAF]/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#8A4BAF]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#8A4BAF]" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 font-dm-sans">
                  {user.name || "Usuario"}
                </p>
                <p className="text-xs text-gray-500 font-dm-sans">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-dm-sans text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
