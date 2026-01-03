import { SignInButton } from "@/components/auth/SignInButton"
import { UserMenu } from "@/components/auth/UserMenu"
import { auth } from "@/lib/auth"
import Link from "next/link"

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-serif text-2xl text-primary">
              ENERGÍA Y DIVINIDAD
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <UserMenu />
              ) : (
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-primary hover:text-primary-dark transition-colors"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <h1 className="font-serif text-4xl md:text-6xl text-primary">
            ENERGÍA Y DIVINIDAD
          </h1>
          <p className="text-lg md:text-xl text-primary-dark max-w-2xl mx-auto">
            Bienvenido a tu espacio de canalización y sanación
          </p>

          {session ? (
            <div className="mt-12 space-y-4">
              <p className="text-primary-dark">
                Hola, <span className="font-semibold">{session.user.name || session.user.email}</span>
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link
                  href="/sesiones"
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Explorar Sesiones
                </Link>
                <Link
                  href="/eventos"
                  className="px-6 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  Ver Eventos
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-12 space-y-4">
              <p className="text-primary-dark">
                Inicia sesión para acceder a sesiones, eventos y contenido premium
              </p>
              <div className="flex gap-4 justify-center">
                <SignInButton provider="google" />
              </div>
            </div>
          )}

          <div className="mt-12">
            <p className="text-sm text-gray-500">
              🚧 Proyecto en desarrollo - FASE 4 completada: NextAuth.js ✅
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
