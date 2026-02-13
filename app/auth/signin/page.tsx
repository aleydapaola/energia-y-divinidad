"use client"

import { Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Suspense, useState } from "react"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const errorParam = searchParams.get("error")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === "CredentialsSignin" ? "Email o contraseña incorrectos" : null
  )
  const [showPassword, setShowPassword] = useState(false)
  const [emailNotVerified, setEmailNotVerified] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
    setEmailNotVerified(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError("Email y contraseña son requeridos")
      return
    }

    setIsLoading(true)
    setError(null)
    setEmailNotVerified(false)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true)
          setError("Tu email no está verificado")
        } else {
          setError("Email o contraseña incorrectos")
        }
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            placeholder="tu@email.com"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8A4BAF] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-dm-sans">
            {error}
            {emailNotVerified && (
              <Link
                href={`/auth/verify-email?email=${encodeURIComponent(formData.email)}`}
                className="block mt-2 text-[#8A4BAF] hover:underline"
              >
                Haz clic aquí para verificar tu email
              </Link>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#4944a4] text-white py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </button>
      </form>

      <div className="text-center text-sm font-dm-sans">
        <span className="text-gray-600">¿No tienes una cuenta? </span>
        <Link
          href="/auth/signup"
          className="text-[#8A4BAF] hover:text-[#654177] font-semibold"
        >
          Regístrate
        </Link>
      </div>
    </div>
  )
}

function SignInLoading() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <div className="animate-pulse space-y-5">
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="font-rightland text-4xl text-[#8A4BAF] mb-2">
              Energía y Divinidad
            </h1>
          </Link>
          <p className="text-[#654177] font-dm-sans">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        <Suspense fallback={<SignInLoading />}>
          <SignInForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 font-dm-sans">
          Al continuar, aceptas nuestros{" "}
          <Link href="/terminos" className="text-[#8A4BAF] hover:underline">
            Términos de Servicio
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" className="text-[#8A4BAF] hover:underline">
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}
