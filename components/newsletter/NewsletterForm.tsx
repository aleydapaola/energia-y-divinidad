"use client"

import { useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"

interface NewsletterFormProps {
  variant?: "footer" | "inline" | "card"
  className?: string
}

export function NewsletterForm({ variant = "footer", className = "" }: NewsletterFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setStatus("error")
      setMessage("Por favor, introduce un email válido")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message)
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Error al suscribirse")
      }
    } catch {
      setStatus("error")
      setMessage("Error de conexión. Por favor, intenta de nuevo.")
    }
  }

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm">{message}</span>
      </div>
    )
  }

  if (variant === "footer") {
    return (
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu email"
            required
            disabled={status === "loading"}
            className="px-4 py-2.5 bg-white border border-[#8A4BAF]/20 rounded-lg text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-1 focus:ring-[#8A4BAF] transition-colors disabled:opacity-50"
            aria-label="Email para newsletter"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-2.5 bg-[#4944a4] text-white rounded-lg text-sm font-medium hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suscribiendo...
              </>
            ) : (
              "Suscribirme"
            )}
          </button>
        </div>
        {status === "error" && (
          <p className="text-red-500 text-xs mt-2">{message}</p>
        )}
      </form>
    )
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={className}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu email"
            required
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-lg text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-1 focus:ring-[#8A4BAF] transition-colors disabled:opacity-50"
            aria-label="Email para newsletter"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-3 bg-[#4944a4] text-white rounded-lg text-sm font-medium hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suscribiendo...
              </>
            ) : (
              "Suscribirme"
            )}
          </button>
        </div>
        {status === "error" && (
          <p className="text-red-500 text-xs mt-2">{message}</p>
        )}
      </form>
    )
  }

  // variant === "card"
  return (
    <div className={`bg-gradient-to-br from-[#f8f0f5] to-[#eef1fa] rounded-2xl p-6 sm:p-8 ${className}`}>
      <h3 className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF] mb-2">
        Únete a nuestra comunidad
      </h3>
      <p className="text-[#654177] text-sm mb-4">
        Recibe meditaciones gratuitas, contenido exclusivo y novedades directamente en tu correo.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu email"
            required
            disabled={status === "loading"}
            className="flex-1 px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-lg text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-1 focus:ring-[#8A4BAF] transition-colors disabled:opacity-50"
            aria-label="Email para newsletter"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-3 bg-[#4944a4] text-white rounded-lg text-sm font-medium hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suscribiendo...
              </>
            ) : (
              "Suscribirme"
            )}
          </button>
        </div>
        {status === "error" && (
          <p className="text-red-500 text-xs mt-2">{message}</p>
        )}
      </form>
    </div>
  )
}
