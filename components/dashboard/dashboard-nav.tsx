"use client"

import { User, Calendar, ShoppingBag, Settings, Crown, GraduationCap, CalendarCheck } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  {
    href: "/mi-cuenta",
    label: "Mi Cuenta",
    icon: User,
    exact: true,
  },
  {
    href: "/mi-cuenta/sesiones",
    label: "Mis Sesiones",
    icon: Calendar,
  },
  {
    href: "/mi-cuenta/cursos",
    label: "Mis Cursos",
    icon: GraduationCap,
  },
  {
    href: "/mi-cuenta/eventos",
    label: "Mis Eventos",
    icon: CalendarCheck,
  },
  {
    href: "/mi-cuenta/compras",
    label: "Mis Compras",
    icon: ShoppingBag,
  },
  {
    href: "/mi-cuenta/configuracion",
    label: "Configuración",
    icon: Settings,
  },
]

interface DashboardNavProps {
  hasMembership?: boolean
}

export function DashboardNav({ hasMembership }: DashboardNavProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-dm-sans transition-colors ${
                  active
                    ? "bg-[#4944a4] text-white"
                    : "text-gray-600 hover:bg-[#eef1fa] hover:text-[#4944a4]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}

        {/* Membresía - destacado */}
        <li className="pt-4 border-t border-gray-200 mt-4">
          <Link
            href={hasMembership ? "/dashboard/membresia/publicaciones" : "/membresia"}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-dm-sans transition-colors ${
              hasMembership
                ? "bg-gradient-to-r from-[#4944a4] to-[#3d3a8a] text-white"
                : "bg-[#4944a4] text-white hover:bg-[#3d3a8a]"
            }`}
          >
            <Crown className="w-5 h-5" />
            <span>{hasMembership ? "Ir a Membresía" : "Obtener Membresía"}</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}
