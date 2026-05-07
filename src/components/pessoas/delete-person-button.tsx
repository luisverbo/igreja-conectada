'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  personId: string
  personName: string
}

export function DeletePersonButton({ personId, personName }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('people').delete().eq('id', personId)
    if (err) {
      setError('Erro ao apagar. Tente novamente.')
      setLoading(false)
      return
    }
    router.push('/pessoas')
    router.refresh()
  }

  if (!confirm) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="h-4 w-4 mr-2" />
        Apagar
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
      <span className="text-sm text-red-700 font-medium">Apagar {personName}?</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-1"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-red-500 hover:text-red-700">
        Cancelar
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
