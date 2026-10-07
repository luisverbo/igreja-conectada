'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gauge, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { gcaCapacity } from '@/lib/gca'

export interface CapacityGca {
  id: string
  name: string
  leaders: string | null
  max_members: number | null
  count: number
}

interface Props {
  churchId: string
  defaultLimit: number | null
  gcas: CapacityGca[]
}

const toNum = (s: string) => {
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Limite de participantes: um padrão que vale para todos os GCAs e,
 * se quiser, um limite próprio para alguns (deixar vazio = usa o padrão).
 */
export function CapacityDialog({ churchId, defaultLimit, gcas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [def, setDef] = useState(defaultLimit ? String(defaultLimit) : '')
  const [own, setOwn] = useState<Record<string, string>>({})

  function openDialog() {
    setDef(defaultLimit ? String(defaultLimit) : '')
    setOwn(Object.fromEntries(gcas.map(g => [g.id, g.max_members ? String(g.max_members) : ''])))
    setError(null)
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const newDef = toNum(def)
    if (newDef !== defaultLimit) {
      const { error: e } = await supabase.from('churches').update({ gca_default_max_members: newDef }).eq('id', churchId)
      if (e) { setError('Erro ao salvar o limite padrão: ' + e.message); setSaving(false); return }
    }

    const changed = gcas.filter(g => toNum(own[g.id] || '') !== (g.max_members || null))
    for (const g of changed) {
      const { error: e } = await supabase.from('discipleships').update({ max_members: toNum(own[g.id] || '') }).eq('id', g.id)
      if (e) { setError(`Erro ao salvar ${g.name}: ${e.message}`); setSaving(false); return }
    }

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const previewDef = toNum(def)
  const overCount = gcas.filter(g => gcaCapacity(toNum(own[g.id] || ''), previewDef, g.count).state === 'acima').length

  return (
    <>
      <button
        onClick={openDialog}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Gauge className="h-4 w-4" /> Limite de participantes
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom)] sm:pb-0 flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Limite de participantes</h2>
                <p className="text-xs text-slate-500 mt-0.5">GCA acima do limite fica vermelho na lista e no mapa.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4">
                <label className="block text-sm font-bold text-violet-900">Limite padrão — todos os GCAs</label>
                <p className="text-xs text-violet-700/80 mb-2">Vale para todo GCA que não tiver um limite próprio. Vazio = sem limite.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} inputMode="numeric"
                    value={def} onChange={e => setDef(e.target.value)}
                    placeholder="Ex: 20"
                    className="w-28 h-10 rounded-lg border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-violet-800">participantes</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">Limite próprio (opcional)</p>
                <p className="text-xs text-slate-500 mb-2">Só para os GCAs que precisam de um número diferente — ex.: uma casa menor. Vazio = usa o padrão.</p>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {gcas.map(g => {
                    const cap = gcaCapacity(toNum(own[g.id] || ''), previewDef, g.count)
                    return (
                      <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{g.name}</p>
                          <p className={`text-xs ${cap.state === 'acima' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                            {g.count} membro{g.count === 1 ? '' : 's'}
                            {cap.limit != null && ` / ${cap.limit}`}
                            {cap.state === 'acima' && ` · ${cap.over} acima`}
                          </p>
                        </div>
                        <input
                          type="number" min={1} inputMode="numeric"
                          value={own[g.id] || ''}
                          onChange={e => setOwn(p => ({ ...p, [g.id]: e.target.value }))}
                          placeholder={previewDef ? `${previewDef}` : '—'}
                          title="Vazio = usa o limite padrão"
                          className="w-20 h-9 rounded-lg border border-slate-200 px-2 text-sm text-center placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {overCount > 0 && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Com esses limites, {overCount} GCA{overCount === 1 ? ' fica' : 's ficam'} acima da capacidade.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar limites
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
