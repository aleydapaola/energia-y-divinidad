"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showResendLink, setShowResendLink] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
    setShowResendLink(false)
    setUnverifiedEmail(null)
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("El nombre es requerido")
      return false
    }
    if (!formData.email.trim()) {
      setError("El email es requerido")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("El email no es válido")
      return false
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Si el email no está verificado, mostrar opción de reenvío
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setShowResendLink(true)
          setUnverifiedEmail(data.email)
          setError("Este email ya está registrado")
        } else {
          setError(data.error || "Error al crear la cuenta")
        }
        return
      }

      // Redirect to verify email page
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta")
    } finally {
      setIsLoading(false)
    }
  }

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
            Crea tu cuenta para comenzar tu viaje
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
              >
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
                placeholder="Tu nombre"
              />
            </div>

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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
                  placeholder="Mínimo 8 caracteres"
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

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
                  placeholder="Repite tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8A4BAF] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-dm-sans">
                <p>{error}</p>
                {showResendLink && unverifiedEmail && (
                  <p className="mt-2">
                    <Link
                      href={`/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}&resend=true`}
                      className="text-[#8A4BAF] hover:text-[#654177] font-semibold underline"
                    >
                      Reenviar email de verificación
                    </Link>
                  </p>
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
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <div className="text-center text-sm font-dm-sans">
            <span className="text-gray-600">¿Ya tienes una cuenta? </span>
            <Link
              href="/auth/signin"
              className="text-[#8A4BAF] hover:text-[#654177] font-semibold"
            >
              Inicia sesión
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 font-dm-sans">
          Al registrarte, aceptas nuestros{" "}
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
