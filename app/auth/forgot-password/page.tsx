"use client"

import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Suspense, useState } from "react"

function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError("El email es requerido")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al procesar la solicitud")
        return
      }

      setSuccess(true)
    } catch {
      setError("Error al procesar la solicitud")
    } finally {
      setIsLoading(false)
    }
  }

  // Éxito - email enviado
  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#654177] font-dm-sans mb-2 text-center">
            Revisa tu correo
          </h2>
          <p className="text-gray-600 font-dm-sans text-center mb-2">
            Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
          </p>
          <p className="text-sm text-gray-500 font-dm-sans text-center mb-6">
            El enlace expira en 1 hora.
          </p>
          <Link
            href="/auth/signin"
            className="text-[#8A4BAF] hover:text-[#654177] font-dm-sans font-semibold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <div className="flex flex-col items-center mb-4">
        <div className="w-16 h-16 bg-[#f8f0f5] rounded-full flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[#8A4BAF]" />
        </div>
        <p className="text-gray-600 font-dm-sans text-center">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            disabled={isLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            placeholder="tu@email.com"
          />
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
              Enviando...
            </>
          ) : (
            "Enviar enlace de recuperación"
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/auth/signin"
          className="text-sm text-[#8A4BAF] hover:text-[#654177] font-dm-sans flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}

function ForgotPasswordLoading() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <div className="animate-pulse space-y-5">
        <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
        <div className="h-12 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
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
            Recupera tu contraseña
          </p>
        </div>

        <Suspense fallback={<ForgotPasswordLoading />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
