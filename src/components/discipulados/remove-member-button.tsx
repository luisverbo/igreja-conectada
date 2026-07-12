'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  memberId: string
  personId: string
  personName: string
}

export function RemoveMemberButton({ memberId, personId, personName }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    const supabase = createClient()

    await supabase.from('discipleship_observations').delete().eq('member_id', memberId)
    await supabase.from('discipleship_members').delete().eq('id', memberId)

    // Person leaves the discipleship journey stage; keep can_serve as-is
    await supabase.from('people').update({ status: 'concluiu_novos_membros' }).eq('id', personId).eq('status', 'em_discipulado')

    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (!confirm) {
    return (
      <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-red-500" onClick={() => setConfirm(true)}>
        <UserMinus className="h-3 w-3 mr-1" />
        Remover
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-2 space-y-1.5 w-36">
      <p className="text-xs text-red-700 leading-tight">Remover {personName} do grupo? As observações serão apagadas.</p>
      <div className="flex gap-1">
        <button
          onClick={handleRemove}
          disabled={loading}
          className="flex-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center justify-center"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sim'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
        >
          Não
        </button>
      </div>
    </div>
  )
}
