'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, X, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  classId: string
  churchId: string
  userId: string
}

export function EnrollmentDialog({ classId, churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])

  function close() {
    setOpen(false)
    setSelected([])
    setSearchQuery('')
    setSearchResults([])
    setError(null)
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

  function addPerson(person: any) {
    setSelected(prev => [...prev, person])
    setSearchResults([])
    setSearchQuery('')
  }

  async function handleEnroll() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: upsertError } = await supabase
      .from('new_members_enrollments')
      .upsert(
        selected.map(p => ({ class_id: classId, person_id: p.id })),
        { onConflict: 'class_id,person_id' }
      )

    if (upsertError) {
      setError('Erro ao matricular: ' + upsertError.message)
      setLoading(false)
      return
    }

    for (const p of selected) {
      await supabase.from('people').update({ status: 'em_novos_membros' }).eq('id', p.id)
      await supabase.from('journey_events').insert({
        person_id: p.id,
        event_type: 'entrou_novos_membros',
        recorded_by: userId,
      })
    }

    setLoading(false)
    close()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        Matricular Aluno
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Matricular Alunos na Turma</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => search(e.target.value)}
                  placeholder="Buscar pessoa por nome..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPerson(p)}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-900">{p.full_name}</span>
                      {p.phone && <span className="text-slate-400 text-xs">{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}

              {selected.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selecionados ({selected.length})</p>
                  {selected.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                      <span className="text-sm font-medium text-violet-800">{p.full_name}</span>
                      <button
                        type="button"
                        onClick={() => setSelected(prev => prev.filter(x => x.id !== p.id))}
                        className="text-violet-400 hover:text-violet-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={loading || selected.length === 0}
                  className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {loading ? 'Matriculando...' : `Matricular${selected.length > 0 ? ` (${selected.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
