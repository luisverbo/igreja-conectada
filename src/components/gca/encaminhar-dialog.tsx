'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, X, Loader2, MapPin, Check, Navigation } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sortByProximity, formatKm } from '@/lib/geo'

interface Props {
  personId: string
  personName: string
  personLat: number | null
  personLng: number | null
  churchId: string
  trigger?: 'button' | 'link'
  label?: string
  onDone?: () => void
}

export function EncaminharDialog({ personId, personName, personLat, personLng, churchId, trigger = 'button', label = 'Encaminhar ao GCA', onDone }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [gcas, setGcas] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('discipleships')
      .select('id, name, latitude, longitude, location:gca_locations(name, host_name, neighborhood, city), leader:profiles!discipleships_leader_id_fkey(full_name), leader2_name')
      .eq('church_id', churchId)
      .eq('status', 'ativo')
      .then(({ data }) => {
        const sorted = sortByProximity(data || [], personLat, personLng)
        setGcas(sorted)
        if (sorted[0]) setSelected(sorted[0].id)
      })
  }, [open, churchId, personLat, personLng])

  async function submit() {
    if (!selected) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/gca/encaminhar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, targetDiscipleshipId: selected, reason: reason || null }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Erro ao encaminhar.' }); return }

    const resultMsg: Record<string, string> = {
      incluido: `${personName} foi encaminhado(a) ao GCA! 🏠`,
      incluido_autorizado: `${personName} foi incluído(a) no GCA (autorizado).`,
      transferido: `${personName} foi transferido(a) para o GCA.`,
      solicitacao_transferencia: 'Solicitação de transferência enviada ao supervisor. ⏳',
      solicitacao_inclusao: 'Solicitação de inclusão enviada ao supervisor. ⏳',
    }
    setMsg({ type: 'ok', text: resultMsg[data.result] || 'Encaminhamento registrado!' })
    setTimeout(() => { setOpen(false); setMsg(null); onDone?.(); router.refresh() }, 1600)
  }

  return (
    <>
      {trigger === 'link' ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800">
          <Home className="h-3.5 w-3.5" /> {label}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          <Home className="h-4 w-4" /> {label}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Encaminhar ao GCA</h2>
                <p className="text-xs text-slate-500 mt-0.5">{personName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-3">
              {personLat != null && personLng != null ? (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5" /> GCAs ordenados pela proximidade da residência
                </p>
              ) : (
                <p className="text-xs text-amber-600">Sem endereço geolocalizado — não é possível calcular distância.</p>
              )}

              {gcas.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhum GCA ativo disponível</p>
              ) : (
                <div className="space-y-2">
                  {gcas.map((g, i) => {
                    const l1 = g.leader?.full_name
                    const l2 = g.leader2_name
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelected(g.id)}
                        className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                          selected === g.id ? 'border-violet-600 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-bold ${selected === g.id ? 'text-violet-900' : 'text-slate-800'}`}>
                            {i === 0 && g.distanceKm != null && <span className="text-emerald-600">📍 Mais próximo · </span>}
                            {g.name}
                          </p>
                          {g.distanceKm != null && (
                            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{formatKm(g.distanceKm)}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {[l1 && l2 ? `👫 ${l1.split(' ')[0]} & ${l2.split(' ')[0]}` : l1, g.location?.neighborhood || g.location?.name].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}

              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="Observação (opcional) — ex: mora perto, pediu esse horário..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />

              {msg && (
                <div className={`rounded-lg px-3 py-2.5 text-sm ${msg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {msg.type === 'ok' && <Check className="inline h-4 w-4 mr-1" />}{msg.text}
                </div>
              )}

              <button
                onClick={submit}
                disabled={loading || !selected}
                className="w-full h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
                Encaminhar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
