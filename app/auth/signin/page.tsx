import { SignInButton } from "@/components/auth/SignInButton"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-primary mb-2">
            ENERGÍA Y DIVINIDAD
          </h1>
          <p className="text-primary-dark">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="space-y-4">
            <SignInButton provider="google" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  o continúa con email
                </span>
              </div>
            </div>

            <Link
              href="/auth/signin/email"
              className="block w-full text-center px-6 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              Iniciar sesión con Email
            </Link>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">¿No tienes una cuenta? </span>
            <Link
              href="/auth/signup"
              className="text-primary hover:text-primary-dark font-semibold"
            >
              Regístrate
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          Al continuar, aceptas nuestros{" "}
          <Link href="/terminos" className="text-primary hover:underline">
            Términos de Servicio
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}
