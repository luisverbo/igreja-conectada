'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

interface Props {
  token: string
}

export function CopyLinkButton({ token }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/inscricao/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copiar link de inscrição"
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? 'Link copiado!' : 'Link de Inscrição'}
    </button>
  )
}
