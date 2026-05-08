'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, AlertTriangle, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Props {
  discipleshipId: string
  churchId: string
  userId: string
  userRole: string
}

// Statuses that mean the person has completed (or bypassed) NM
const NM_COMPLETED = ['concluiu_novos_membros', 'em_discipulado', 'liberado_para_servir']

// Roles that can authorize adding someone who hasn't completed NM
const CAN_AUTHORIZE = ['super_admin', 'pastor', 'coordinator', 'discipleship_supervisor']

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu NM',
  em_discipulado: 'Em Discipulado',
  liberado_para_servir: 'Liberado p/ Servir',
}

function needsAuth(person: any) {
  return !NM_COMPLETED.includes(person.status)
}

export function AddMemberDialog({ discipleshipId, churchId, userId, userRole }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)

  const isAuthorized = CAN_AUTHORIZE.includes(userRole)

  function close() {
    setOpen(false)
    setSelected([])
    setSearchQuery('')
    setSearchResults([])
    setBlockedMsg(null)
  }

  async function search(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('people')
      .select('id, full_name, phone, status')
      .eq('church_id', churchId)
      .ilike('full_name', `%${q}%`)
      .limit(8)
    setSearchResults(data?.filter(p => !selected.find(s => s.id === p.id)) || [])
  }

  function add(person: any) {
    if (needsAuth(person) && !isAuthorized) {
      setBlockedMsg(
        `${person.full_name} ainda não concluiu os Novos Membros. Apenas o supervisor ou pastor pode adicioná-la ao discipulado.`
      )
      return
    }
    setBlockedMsg(null)
    setSelected(prev => [...prev, person])
    setSearchResults([])
    setSearchQuery('')
  }

  function remove(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  async function handleAdd() {
    setLoading(true)
    const supabase = createClient()

    await supabase.from('discipleship_members').upsert(
      selected.map(p => ({ discipleship_id: discipleshipId, person_id: p.id, status: 'ativo' })),
      { onConflict: 'discipleship_id,person_id' }
    )

    for (const p of selected) {
      await supabase.from('people').update({ status: 'em_discipulado' }).eq('id', p.id)
      await supabase.from('journey_events').insert({
        person_id: p.id,
        event_type: 'entrou_discipulado',
        reference_id: discipleshipId,
        reference_type: 'discipulado',
        recorded_by: userId,
        ...(needsAuth(p) ? { description: `Autorizado por ${userRole.replace(/_/g, ' ')} — pessoa sem NM concluído` } : {}),
      })
    }

    setLoading(false)
    close()
    router.refresh()
  }

  const hasUnauthorized = selected.some(needsAuth)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Adicionar Membro
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!o) close(); else setOpen(true) }}>
        <DialogContent onClose={close}>
          <DialogHeader>
            <DialogTitle>Adicionar Membros ao Discipulado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => search(e.target.value)}
                placeholder="Buscar pessoa por nome..."
                className="pl-9"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map(p => {
                  const restricted = needsAuth(p) && !isAuthorized
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => add(p)}
                      disabled={restricted}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2 ${
                        restricted ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900">{p.full_name}</span>
                        {p.phone && <span className="text-slate-400 ml-2 text-xs">{p.phone}</span>}
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${
                        needsAuth(p)
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Blocked message */}
            {blockedMsg && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{blockedMsg}</span>
                <button onClick={() => setBlockedMsg(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {selected.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Selecionados ({selected.length})
                </p>
                {selected.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      needsAuth(p)
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-violet-200 bg-violet-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {needsAuth(p) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                      <span className={`text-sm font-medium ${needsAuth(p) ? 'text-amber-800' : 'text-violet-800'}`}>
                        {p.full_name}
                      </span>
                    </div>
                    <button type="button" onClick={() => remove(p.id)}
                      className={`text-xs ml-2 flex-shrink-0 ${needsAuth(p) ? 'text-amber-400 hover:text-amber-600' : 'text-violet-400 hover:text-violet-600'}`}>
                      Remover
                    </button>
                  </div>
                ))}

                {/* Warning for authorized users adding someone without NM */}
                {hasUnauthorized && isAuthorized && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      Uma ou mais pessoas ainda não concluíram os Novos Membros.
                      Ao confirmar, você está autorizando a inclusão como <strong>{userRole.replace(/_/g, ' ')}</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={loading || selected.length === 0}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Adicionando...</> : `Adicionar${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
