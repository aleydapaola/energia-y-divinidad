import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Calendar, Users, LayoutDashboard, Settings, ArrowLeft } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin")
  }

  // Verify user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== "ADMIN") {
    redirect("/mi-cuenta")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-[#654177] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Volver al sitio</span>
              </Link>
              <div className="h-6 w-px bg-white/30" />
              <h1 className="font-gazeta text-xl">Panel de Administración</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/80">
                {session.user.name || session.user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-4rem)] border-r border-gray-200">
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Dashboard</span>
            </Link>
            <Link
              href="/admin/bookings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Sesiones</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Users className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Usuarios</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
