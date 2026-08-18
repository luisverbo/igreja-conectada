'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, LockOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SurveyToggle({ surveyId, active }: { surveyId: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('surveys').update({ active: !active }).eq('id', surveyId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? 'Encerrar — para de receber respostas' : 'Reabrir pesquisa'}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {active ? 'Recebendo respostas' : 'Encerrada'}
    </button>
  )
}
