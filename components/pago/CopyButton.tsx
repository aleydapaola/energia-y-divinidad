"use client"

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-2 rounded-lg hover:bg-brand/10 transition-colors group"
      title="Copiar"
    >
      {copied ? (
        <Check className="w-5 h-5 text-green-600" />
      ) : (
        <Copy className="w-5 h-5 text-brand/60 group-hover:text-brand" />
      )}
    </button>
  )
}
