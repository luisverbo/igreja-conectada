'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function act(action: 'aprovar' | 'rejeitar') {
    setLoading(action)
    await fetch('/api/gca/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={() => act('aprovar')}
        disabled={!!loading}
        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading === 'aprovar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Aprovar
      </button>
      <button
        onClick={() => act('rejeitar')}
        disabled={!!loading}
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading === 'rejeitar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Rejeitar
      </button>
    </div>
  )
}
