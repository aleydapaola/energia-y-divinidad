'use client'

import { Send, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Escribe un comentario')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(content)
      setContent('')
    } catch (err: any) {
      setError(err.message || 'Error al enviar comentario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un comentario..."
          className="w-full px-4 py-3 pr-12 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
          rows={3}
          disabled={submitting}
        />

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="absolute bottom-3 right-3 p-2 bg-brand hover:bg-brand-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Enviar comentario"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
      )}
    </form>
  )
}
