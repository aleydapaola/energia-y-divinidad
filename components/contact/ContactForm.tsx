'use client'

import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface FormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el mensaje')
      }

      setStatus('success')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al enviar el mensaje'
      )
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-gradient-to-br from-[#f8f0f5] via-white to-[#eef1fa] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-[#8A4BAF]/10">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-gazeta text-2xl sm:text-3xl text-[#8A4BAF] mb-3">
            ¡Mensaje enviado!
          </h2>
          <p className="font-dm-sans text-[#674c6a] mb-6">
            Gracias por contactarme. Te responderé lo antes posible.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#4944a4] text-white rounded-full hover:bg-[#3d3890] transition-all font-dm-sans text-sm font-semibold"
          >
            Enviar otro mensaje
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#f8f0f5] via-white to-[#eef1fa] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-[#8A4BAF]/10">
      <h2 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-2">
        Envíame un mensaje
      </h2>
      <p className="font-dm-sans text-[#674c6a] mb-8">
        Completa el formulario y te responderé lo antes posible.
      </p>

      {status === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-dm-sans text-red-700 font-medium">
              Error al enviar
            </p>
            <p className="font-dm-sans text-red-600 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block font-dm-sans text-[#4A4A4A] text-sm font-medium mb-2"
          >
            Nombre completo *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-xl text-[#4A4A4A] placeholder-[#9a9a9a] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Tu nombre"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block font-dm-sans text-[#4A4A4A] text-sm font-medium mb-2"
          >
            Correo electrónico *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-xl text-[#4A4A4A] placeholder-[#9a9a9a] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="tu@email.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block font-dm-sans text-[#4A4A4A] text-sm font-medium mb-2"
          >
            Teléfono / WhatsApp
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-xl text-[#4A4A4A] placeholder-[#9a9a9a] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="+57 300 123 4567"
          />
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="subject"
            className="block font-dm-sans text-[#4A4A4A] text-sm font-medium mb-2"
          >
            Asunto *
          </label>
          <select
            id="subject"
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-xl text-[#4A4A4A] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona un tema</option>
            <option value="sesiones">Sesiones de canalización</option>
            <option value="membresia">Membresía</option>
            <option value="academia">Academia / Cursos</option>
            <option value="eventos">Eventos y talleres</option>
            <option value="colaboracion">Colaboración / Prensa</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="block font-dm-sans text-[#4A4A4A] text-sm font-medium mb-2"
          >
            Mensaje *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={formData.message}
            onChange={handleChange}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-white border border-[#8A4BAF]/20 rounded-xl text-[#4A4A4A] placeholder-[#9a9a9a] focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 transition-all font-dm-sans resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Cuéntame en qué puedo ayudarte..."
           />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#4944a4] text-white rounded-full hover:bg-[#3d3890] transition-all transform hover:scale-[1.02] font-dm-sans text-base font-semibold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Enviar mensaje
            </>
          )}
        </button>

        <p className="font-dm-sans text-xs text-[#9a9a9a] text-center">
          Al enviar este formulario, aceptas nuestra{' '}
          <a
            href="/politica-de-privacidad"
            className="text-[#8A4BAF] hover:underline"
          >
            política de privacidad
          </a>
          .
        </p>
      </form>
    </div>
  )
}
