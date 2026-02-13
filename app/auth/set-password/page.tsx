"use client"

import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"

interface TokenValidation {
  valid: boolean
  email?: string
  name?: string
  hasPassword?: boolean
  error?: string
}

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenData, setTokenData] = useState<TokenValidation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  // Validar token al cargar
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenData({ valid: false, error: "Token no proporcionado" })
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/set-password?token=${token}`)
        const data = await response.json()
        setTokenData(data)
      } catch {
        setTokenData({ valid: false, error: "Error al validar el token" })
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.password || !formData.confirmPassword) {
      setError("Todos los campos son requeridos")
      return
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al establecer la contraseña")
        return
      }

      setSuccess(true)
    } catch {
      setError("Error al establecer la contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  // Estado de carga inicial
  if (isValidating) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF] mb-4" />
          <p className="text-[#654177] font-dm-sans">Validando enlace...</p>
        </div>
      </div>
    )
  }

  // Token inválido o expirado
  if (!tokenData?.valid) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        <div className="flex flex-col items-center justify-center py-8">
          <XCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-[#654177] font-dm-sans mb-2">
            Enlace inválido
          </h2>
          <p className="text-gray-600 font-dm-sans text-center mb-6">
            {tokenData?.error || "Este enlace ha expirado o ya fue utilizado."}
          </p>
          <Link
            href="/auth/signin"
            className="bg-[#4944a4] text-white px-6 py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors"
          >
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  // Usuario ya tiene contraseña
  if (tokenData.hasPassword) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-[#654177] font-dm-sans mb-2">
            Ya tienes contraseña
          </h2>
          <p className="text-gray-600 font-dm-sans text-center mb-6">
            Tu cuenta ya tiene una contraseña establecida. Puedes iniciar sesión directamente.
          </p>
          <Link
            href="/auth/signin"
            className="bg-[#4944a4] text-white px-6 py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  // Éxito al establecer contraseña
  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-[#654177] font-dm-sans mb-2">
            ¡Contraseña establecida!
          </h2>
          <p className="text-gray-600 font-dm-sans text-center mb-6">
            Tu contraseña ha sido configurada correctamente. Ya puedes iniciar sesión y acceder a tu cuenta.
          </p>
          <Link
            href="/auth/signin?callbackUrl=%2Fmi-cuenta"
            className="w-full bg-[#4944a4] text-white py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors flex items-center justify-center gap-2"
          >
            Iniciar Sesión
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }

  // Formulario para establecer contraseña
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      {tokenData.name && (
        <p className="text-center text-[#654177] font-dm-sans">
          Hola <strong>{tokenData.name}</strong>, establece tu contraseña para acceder a tu cuenta.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email (readonly) */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={tokenData.email || ""}
            disabled
            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-dm-sans"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
          >
            Nueva Contraseña
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
            Confirmar Contraseña
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
            {error}
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
              Guardando...
            </>
          ) : (
            "Establecer Contraseña"
          )}
        </button>
      </form>
    </div>
  )
}

function SetPasswordLoading() {
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

export default function SetPasswordPage() {
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
            Establece tu contraseña para acceder
          </p>
        </div>

        <Suspense fallback={<SetPasswordLoading />}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
