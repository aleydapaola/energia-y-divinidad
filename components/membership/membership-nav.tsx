'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  GraduationCap,
  Calendar,
  Crown,
  BookOpen,
  FileText,
  Settings,
  BarChart3,
  LogOut
} from 'lucide-react'
import type { UserSubscription } from '@/types/membership'

interface MembershipNavProps {
  subscription: UserSubscription | null
}

const navItems = [
  {
    href: '/',
    label: 'Inicio',
    icon: Home,
    external: true,
  },
  {
    href: '/dashboard/membresia/publicaciones',
    label: 'Publicaciones',
    icon: FileText,
  },
  {
    href: '/dashboard/membresia/biblioteca',
    label: 'Biblioteca',
    icon: BookOpen,
  },
  {
    href: '/dashboard/membresia/configuracion',
    label: 'Configuración',
    icon: Settings,
  },
]

// Items futuros (deshabilitados por ahora)
const futureNavItems = [
  {
    href: '#',
    label: 'Mis Cursos',
    sublabel: 'Comprados',
    icon: GraduationCap,
    disabled: true,
  },
  {
    href: '#',
    label: 'Mis Eventos',
    sublabel: 'Reservados',
    icon: Calendar,
    disabled: true,
  },
  {
    href: '#',
    label: 'Estadísticas',
    icon: BarChart3,
    disabled: true,
  },
]

export function MembershipNav({ subscription }: MembershipNavProps) {
  const pathname = usePathname()

  return (
    <nav className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-4">
      {/* Header con info de cuenta */}
      <div className="bg-gradient-to-br from-[#f8f0f5] to-white p-6 border-b border-[#e8d5e0]">
        <h2 className="font-gazeta text-xl text-[#654177] mb-1">Mi Cuenta</h2>
        <p className="text-sm text-[#8A4BAF]/70">Dashboard</p>
      </div>

      {/* Navegación principal */}
      <div className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.external
              ? false
              : pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#8A4BAF] text-white shadow-md'
                      : 'text-[#654177] hover:bg-[#f8f0f5]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#8A4BAF]'}`} />
                  <span className="font-dm-sans font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Sección de Membresía */}
        {subscription && (
          <div className="mt-6 pt-6 border-t border-[#e8d5e0]">
            <Link
              href="/dashboard/membresia/publicaciones"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname?.includes('/membresia/publicaciones') || pathname?.includes('/membresia/biblioteca')
                  ? 'bg-gradient-to-r from-[#8A4BAF] to-[#654177] text-white shadow-md'
                  : 'bg-[#f8f0f5] text-[#654177] hover:bg-[#ede4ea]'
              }`}
            >
              <Crown className={`w-5 h-5 ${
                pathname?.includes('/membresia/publicaciones') || pathname?.includes('/membresia/biblioteca')
                  ? 'text-amber-300'
                  : 'text-[#8A4BAF]'
              }`} />
              <div className="flex-1">
                <span className="font-dm-sans font-semibold block">Mi Membresía</span>
                <span className={`text-xs ${
                  pathname?.includes('/membresia/publicaciones') || pathname?.includes('/membresia/biblioteca')
                    ? 'text-white/80'
                    : 'text-[#8A4BAF]/70'
                }`}>
                  {subscription.membershipTierName}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                pathname?.includes('/membresia/publicaciones') || pathname?.includes('/membresia/biblioteca')
                  ? 'bg-white/20 text-white'
                  : 'bg-[#8A4BAF]/10 text-[#8A4BAF]'
              }`}>
                {subscription.status === 'ACTIVE' ? 'Activa' : subscription.status}
              </span>
            </Link>
          </div>
        )}

        {/* Items futuros (deshabilitados) */}
        <div className="mt-4 space-y-1">
          {futureNavItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 cursor-not-allowed opacity-50"
              >
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <span className="font-dm-sans font-medium block">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-gray-400">{item.sublabel}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer del nav */}
      <div className="p-4 border-t border-[#e8d5e0] bg-[#f8f0f5]/50">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-sm text-[#654177] hover:text-[#8A4BAF] transition-colors py-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-dm-sans">Volver al inicio</span>
        </Link>
      </div>
    </nav>
  )
}
