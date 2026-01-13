import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { hasActiveMembership } from "@/lib/membership-access"

interface MiCuentaLayoutProps {
  children: ReactNode
}

export default async function MiCuentaLayout({ children }: MiCuentaLayoutProps) {
  const session = await auth()

  // Verificar autenticación
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/mi-cuenta")
  }

  // Verificar si tiene membresía activa (para mostrar enlace adecuado)
  const hasMembership = await hasActiveMembership(session.user.id)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
      {/* Header */}
      <DashboardHeader user={session.user} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de navegación */}
          <aside className="lg:w-64 flex-shrink-0">
            <DashboardNav hasMembership={hasMembership} />
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
