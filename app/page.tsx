import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import Link from "next/link"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col">
      <Header session={session} />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-8">
            <h2 className="font-serif text-3xl md:text-5xl text-primary">
              Bienvenido a tu espacio de canalización y sanación
            </h2>

            <p className="text-lg md:text-xl text-primary-dark max-w-3xl mx-auto">
              Descubre el poder de la canalización, el chamanismo y la terapia holística
              para transformar tu vida y conectar con tu esencia divina.
            </p>

            {session ? (
              <div className="mt-12 space-y-6">
                <p className="text-primary-dark text-lg">
                  Hola, <span className="font-semibold">{session.user.name || session.user.email}</span>
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link
                    href="/sesiones"
                    className="px-8 py-4 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-lg font-medium"
                  >
                    Explorar Sesiones
                  </Link>
                  <Link
                    href="/eventos"
                    className="px-8 py-4 border-2 border-brand text-brand rounded-lg hover:bg-brand hover:text-white transition-colors text-lg font-medium"
                  >
                    Ver Eventos
                  </Link>
                  <Link
                    href="/membresia"
                    className="px-8 py-4 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors text-lg font-medium"
                  >
                    Membresías
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-12 space-y-6">
                <p className="text-primary-dark text-lg">
                  Inicia sesión para acceder a sesiones, eventos y contenido premium
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-lg font-medium"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/sesiones"
                    className="px-8 py-4 border-2 border-brand text-brand rounded-lg hover:bg-brand hover:text-white transition-colors text-lg font-medium"
                  >
                    Explorar Sesiones
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-16 pt-8 border-t border-primary/10">
              <p className="text-sm text-gray-500">
                🚧 Proyecto en desarrollo - Header y Footer implementados ✅
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
