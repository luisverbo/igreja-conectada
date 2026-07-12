'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, AlertTriangle, X, Loader2, GraduationCap, UserPlus2 } from 'lucide-react'
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
// and mark people as "already completed NM before this system"
const CAN_AUTHORIZE = ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor']

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu NM',
  em_discipulado: 'Em GCA',
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
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<any[]>([])
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)

  // "Mark as completed NM before" flow
  const [markingNM, setMarkingNM] = useState<any | null>(null)
  const [nmComment, setNmComment] = useState('')
  const [nmSaving, setNmSaving] = useState(false)

  // Quick-create flow
  const [creating, setCreating] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newPerson, setNewPerson] = useState({ full_name: '', phone: '', cpf: '', email: '' })

  const isAuthorized = CAN_AUTHORIZE.includes(userRole)

  function close() {
    setOpen(false)
    setSelected([])
    setSearchQuery('')
    setSearchResults([])
    setSearched(false)
    setBlockedMsg(null)
    setMarkingNM(null)
    setCreating(false)
    setNewPerson({ full_name: '', phone: '', cpf: '', email: '' })
  }

  async function search(q: string) {
    setSearchQuery(q)
    setSearched(false)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()

    // Search across name, phone, email and CPF (handles homonyms)
    const digits = q.replace(/\D/g, '')
    const filters = [
      `full_name.ilike.%${q}%`,
      `email.ilike.%${q}%`,
    ]
    if (digits.length >= 4) {
      filters.push(`phone.ilike.%${digits}%`)
      filters.push(`cpf.ilike.%${digits}%`)
    }

    const { data } = await supabase
      .from('people')
      .select('id, full_name, phone, email, cpf, status')
      .eq('church_id', churchId)
      .or(filters.join(','))
      .limit(8)
    setSearchResults(data?.filter(p => !selected.find(s => s.id === p.id)) || [])
    setSearched(true)
  }

  function add(person: any) {
    if (needsAuth(person) && !isAuthorized) {
      setBlockedMsg(
        `${person.full_name} ainda não concluiu os Novos Membros. Apenas o supervisor de GCA ou o pastor pode adicioná-la.`
      )
      return
    }
    setBlockedMsg(null)
    setSelected(prev => [...prev, person])
    setSearchResults([])
    setSearchQuery('')
    setSearched(false)
  }

  function remove(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  // Mark a person as having completed NM before this system existed
  async function confirmMarkNM() {
    if (!markingNM) return
    setNmSaving(true)
    const supabase = createClient()

    await supabase.from('people').update({ status: 'concluiu_novos_membros' }).eq('id', markingNM.id)
    await supabase.from('journey_events').insert({
      person_id: markingNM.id,
      event_type: 'concluiu_novos_membros',
      description: `Marcado manualmente como já concluído${nmComment.trim() ? `: ${nmComment.trim()}` : ' (antes do sistema)'}`,
      recorded_by: userId,
    })

    const updated = { ...markingNM, status: 'concluiu_novos_membros' }
    setSelected(prev => [...prev, updated])
    setSearchResults(prev => prev.filter(p => p.id !== markingNM.id))
    setMarkingNM(null)
    setNmComment('')
    setNmSaving(false)
    setSearchQuery('')
    setSearched(false)
  }

  // Quick-create someone who isn't in the system yet
  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateSaving(true)
    setCreateError(null)
    const supabase = createClient()

    const { data: person, error } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: newPerson.full_name.trim(),
        phone: newPerson.phone.trim() || null,
        cpf: newPerson.cpf.replace(/\D/g, '') || null,
        email: newPerson.email.trim() || null,
        status: 'novo',
        created_by: userId,
      })
      .select('id, full_name, phone, email, cpf, status')
      .single()

    if (error || !person) {
      setCreateError('Erro ao cadastrar: ' + (error?.message || 'tente novamente'))
      setCreateSaving(false)
      return
    }

    await supabase.from('journey_events').insert({
      person_id: person.id,
      event_type: 'cadastrado',
      description: 'Cadastrado(a) diretamente no GCA — não estava no sistema',
      recorded_by: userId,
    })

    setSelected(prev => [...prev, { ...person, isNew: true }])
    setCreating(false)
    setNewPerson({ full_name: '', phone: '', cpf: '', email: '' })
    setCreateSaving(false)
    setSearchQuery('')
    setSearchResults([])
    setSearched(false)
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
  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Adicionar Membro
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!o) close(); else setOpen(true) }}>
        <DialogContent onClose={close}>
          <DialogHeader>
            <DialogTitle>Adicionar Membros ao GCA</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!creating && !markingNM && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => search(e.target.value)}
                    placeholder="Nome, celular, CPF ou e-mail..."
                    className="pl-9"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {searchResults.map(p => {
                      const restricted = needsAuth(p) && !isAuthorized
                      return (
                        <div key={p.id} className={`px-3 py-2.5 ${restricted ? 'bg-slate-50' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => add(p)}
                              disabled={restricted}
                              className={`flex-1 text-left min-w-0 ${restricted ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span className="font-medium text-slate-900 text-sm">{p.full_name}</span>
                              <span className="block text-xs text-slate-400 truncate">
                                {[p.phone, p.cpf ? `CPF ${p.cpf}` : null, p.email].filter(Boolean).join(' · ') || 'sem contato'}
                              </span>
                            </button>
                            <span className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${
                              needsAuth(p) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {STATUS_LABELS[p.status] || p.status}
                            </span>
                          </div>
                          {needsAuth(p) && isAuthorized && (
                            <button
                              type="button"
                              onClick={() => { setMarkingNM(p); setNmComment('') }}
                              className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                            >
                              <GraduationCap className="h-3.5 w-3.5" />
                              Já concluiu Novos Membros antes? Marcar como concluído
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Person not found → quick create */}
                {searched && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <button
                    type="button"
                    onClick={() => { setCreating(true); setNewPerson(p => ({ ...p, full_name: /\d/.test(searchQuery) ? '' : searchQuery })) }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                  >
                    <UserPlus2 className="h-4 w-4" />
                    Não encontrou? Cadastrar nova pessoa
                  </button>
                )}

                {blockedMsg && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{blockedMsg}</span>
                    <button onClick={() => setBlockedMsg(null)} className="ml-auto text-red-400 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Mark-completed-NM confirmation */}
            {markingNM && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-violet-900">
                  <GraduationCap className="inline h-4 w-4 mr-1" />
                  Marcar {markingNM.full_name} como &ldquo;Concluiu Novos Membros&rdquo;
                </p>
                <p className="text-xs text-violet-700">
                  Use quando a pessoa fez o curso antes deste sistema existir. Fica registrado na jornada com seu nome.
                </p>
                <textarea
                  value={nmComment}
                  onChange={e => setNmComment(e.target.value)}
                  rows={2}
                  placeholder='Comentário — ex: "Fez Novos Membros em 2023 na sede"'
                  className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMarkingNM(null)}
                    className="flex-1 h-9 rounded-lg border border-violet-200 bg-white text-sm font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmMarkNM}
                    disabled={nmSaving}
                    className="flex-1 h-9 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700"
                  >
                    {nmSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar e adicionar'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick-create form */}
            {creating && (
              <form onSubmit={handleQuickCreate} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Cadastrar nova pessoa</p>
                  <button type="button" onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPerson.full_name}
                  onChange={e => setNewPerson(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nome completo *"
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={newPerson.phone}
                    onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Celular"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={newPerson.cpf}
                    onChange={e => setNewPerson(p => ({ ...p, cpf: e.target.value }))}
                    placeholder="CPF"
                    className={inputClass}
                  />
                </div>
                <input
                  type="email"
                  value={newPerson.email}
                  onChange={e => setNewPerson(p => ({ ...p, email: e.target.value }))}
                  placeholder="E-mail (opcional)"
                  className={inputClass}
                />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠️ Esta pessoa não estava no sistema. Ela será cadastrada com a ressalva registrada na jornada.
                </p>
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <button
                  type="submit"
                  disabled={createSaving}
                  className="w-full h-9 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700"
                >
                  {createSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar e selecionar'}
                </button>
              </form>
            )}

            {selected.length > 0 && !creating && !markingNM && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Selecionados ({selected.length})
                </p>
                {selected.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      needsAuth(p) ? 'border-amber-200 bg-amber-50' : 'border-violet-200 bg-violet-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {needsAuth(p) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <span className={`text-sm font-medium block truncate ${needsAuth(p) ? 'text-amber-800' : 'text-violet-800'}`}>
                          {p.full_name}
                        </span>
                        {p.isNew && <span className="text-[10px] text-amber-600 font-semibold">⚠️ Não estava no sistema</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => remove(p.id)}
                      className={`text-xs ml-2 flex-shrink-0 ${needsAuth(p) ? 'text-amber-400 hover:text-amber-600' : 'text-violet-400 hover:text-violet-600'}`}>
                      Remover
                    </button>
                  </div>
                ))}

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
