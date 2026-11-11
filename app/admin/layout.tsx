import {
  Calendar,
  Users,
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  ArrowLeft,
  Ticket,
  GraduationCap,
  Tag,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // Verify user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-[#654177] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Volver al sitio</span>
              </Link>
              <div className="h-6 w-px bg-white/30" />
              <h1 className="font-gazeta text-base sm:text-xl">Panel de Administración</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="break-all text-sm text-white/80">
                {session.user.name || session.user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full min-w-0 shrink-0 border-b border-gray-200 bg-white shadow-sm lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:border-b-0 lg:border-r">
          <nav
            aria-label="Administración"
            className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:p-4 [&>a]:shrink-0"
          >
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Dashboard</span>
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Ventas</span>
            </Link>
            <Link
              href="/admin/bookings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Sesiones</span>
            </Link>
            <Link
              href="/admin/subscriptions"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <CreditCard className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Membresías</span>
            </Link>
            <Link
              href="/admin/events"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Ticket className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Eventos</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Users className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Usuarios</span>
            </Link>
            <Link
              href="/admin/communications"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Comunicaciones</span>
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <GraduationCap className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Academia</span>
            </Link>
            <Link
              href="/admin/discount-codes"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-[#f8f0f5] rounded-lg transition-colors"
            >
              <Tag className="w-5 h-5 text-[#8A4BAF]" />
              <span className="font-dm-sans">Descuentos</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
