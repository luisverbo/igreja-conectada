'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  observationId: string
  currentText: string
  needsCare: boolean
}

export function ObservationEditButton({ observationId, currentText, needsCare }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(currentText)
  const [care, setCare] = useState(needsCare)
  const [loading, setLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  async function save() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('discipleship_observations')
      .update({ description: text.trim(), needs_care: care })
      .eq('id', observationId)
    setLoading(false)
    if (!error) { setEditing(false); router.refresh() }
  }

  async function remove() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('discipleship_observations').delete().eq('id', observationId)
    setLoading(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-violet-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={care} onChange={e => setCare(e.target.checked)} className="h-3.5 w-3.5 accent-amber-500" />
          Precisa de cuidado pastoral
        </label>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salvar
          </button>
          <button onClick={() => { setEditing(false); setText(currentText); setCare(needsCare) }} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <X className="h-3 w-3" /> Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (confirmDel) {
    return (
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="text-red-600">Excluir esta observação?</span>
        <button onClick={remove} disabled={loading} className="font-semibold text-red-600 hover:text-red-800">
          {loading ? '...' : 'Sim'}
        </button>
        <button onClick={() => setConfirmDel(false)} className="text-slate-400 hover:text-slate-600">Não</button>
      </div>
    )
  }

  return (
    <div className="mt-1.5 flex items-center gap-3">
      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600">
        <Pencil className="h-3 w-3" /> Editar
      </button>
      <button onClick={() => setConfirmDel(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500">
        <Trash2 className="h-3 w-3" /> Excluir
      </button>
    </div>
  )
}
