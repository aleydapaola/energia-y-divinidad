"use client"

import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const token = searchParams.get("token")
  const shouldResend = searchParams.get("resend") === "true"

  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending")
  const [message, setMessage] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [hasAutoResent, setHasAutoResent] = useState(false)

  const verifyEmail = async (verificationToken: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`)
      const data = await response.json()

      if (response.ok) {
        setVerificationStatus("success")
        setMessage(data.message || "Tu email ha sido verificado exitosamente")
      } else {
        setVerificationStatus("error")
        setMessage(data.error || "Error al verificar el email")
      }
    } catch (error) {
      setVerificationStatus("error")
      setMessage("Error de conexión. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) {return}

    setIsResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Se ha enviado un nuevo email de verificación")
        setResendCooldown(60) // 60 segundos de cooldown
      } else {
        setMessage(data.error || "Error al reenviar el email")
      }
    } catch (error) {
      setMessage("Error de conexión. Por favor intenta de nuevo.")
    } finally {
      setIsResending(false)
    }
  }

  // Si hay token, verificar automáticamente
  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  // Si viene con resend=true, enviar automáticamente
  useEffect(() => {
    if (shouldResend && email && !hasAutoResent && !token) {
      setHasAutoResent(true)
      handleResendEmail()
    }
  }, [shouldResend, email, hasAutoResent, token])

  // Cooldown para reenviar email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Si hay token, mostrar estado de verificación
  if (token) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-[#8A4BAF] mx-auto mb-4" />
            <p className="text-[#654177] font-dm-sans">
              Verificando tu email...
            </p>
          </div>
        ) : verificationStatus === "success" ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
              ¡Email Verificado!
            </h2>
            <p className="text-gray-600 font-dm-sans mb-6">
              {message}
            </p>
            <Link
              href="/auth/signin"
              className="inline-block bg-[#4944a4] text-white px-8 py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
              Error de Verificación
            </h2>
            <p className="text-gray-600 font-dm-sans mb-6">
              {message}
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-[#4944a4] text-white px-8 py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors"
            >
              Registrarse de Nuevo
            </Link>
          </div>
        )}
      </div>
    )
  }

  // Si no hay token, mostrar página de "revisa tu email"
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <div className="text-center">
        <div className="w-20 h-20 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-[#8A4BAF]" />
        </div>

        <h2 className="font-gazeta text-2xl text-[#654177] mb-4">
          Verifica tu Email
        </h2>

        <p className="text-gray-600 font-dm-sans mb-2">
          Hemos enviado un enlace de verificación a:
        </p>

        {email && (
          <p className="text-[#8A4BAF] font-semibold font-dm-sans mb-6">
            {email}
          </p>
        )}

        <p className="text-sm text-gray-500 font-dm-sans mb-6">
          Haz clic en el enlace del email para activar tu cuenta.
          Si no encuentras el email, revisa tu carpeta de spam.
        </p>

        {message && (
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm font-dm-sans mb-4">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={isResending || resendCooldown > 0 || !email}
            className="w-full bg-[#4944a4] text-white py-3 rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : resendCooldown > 0 ? (
              `Reenviar en ${resendCooldown}s`
            ) : (
              "Reenviar Email de Verificación"
            )}
          </button>

          <Link
            href="/auth/signin"
            className="block w-full text-center text-[#8A4BAF] py-3 font-dm-sans font-semibold hover:text-[#654177] transition-colors"
          >
            ¿Ya verificaste? Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

function VerifyEmailLoading() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-[#8A4BAF]/10">
      <div className="text-center py-8">
        <Loader2 className="w-12 h-12 animate-spin text-[#8A4BAF] mx-auto mb-4" />
        <p className="text-[#654177] font-dm-sans">
          Cargando...
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="font-rightland text-4xl text-[#8A4BAF] mb-2">
              Energía y Divinidad
            </h1>
          </Link>
        </div>

        <Suspense fallback={<VerifyEmailLoading />}>
          <VerifyEmailContent />
        </Suspense>

        <p className="text-center text-sm text-gray-500 font-dm-sans">
          ¿Problemas? Contáctanos en{" "}
          <a
            href="mailto:hola@energiaydivinidad.com"
            className="text-[#8A4BAF] hover:underline"
          >
            hola@energiaydivinidad.com
          </a>
        </p>
      </div>
    </div>
  )
}
