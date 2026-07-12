'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Search, X, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/lib/roles'

interface Props {
  churchId: string
  module: string        // module key, e.g. 'discipulados'
  moduleLabel: string   // e.g. 'GCA'
  excludeRoles: string[] // roles already native to this department
}

export function LinkExistingUser({ churchId, module, moduleLabel, excludeRoles }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [linking, setLinking] = useState<string | null>(null)
  const [linked, setLinked] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name, role, custom_access')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setUsers(data || []))
  }, [open, churchId])

  // People from OTHER departments who don't have this module yet
  const candidates = users.filter(u =>
    !excludeRoles.includes(u.role) &&
    u.role !== 'super_admin' &&
    !(u.custom_access || []).includes(module) &&
    !linked.includes(u.id) &&
    (query.length < 2 || u.full_name.toLowerCase().includes(query.toLowerCase()))
  )

  async function link(userId: string) {
    setLinking(userId)
    setError(null)
    const res = await fetch('/api/admin/grant-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, module, action: 'add' }),
    })
    const data = await res.json()
    setLinking(null)
    if (!res.ok) {
      setError(data.error || 'Erro ao vincular.')
      return
    }
    setLinked(prev => [...prev, userId])
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Link2 className="h-4 w-4" />
        Vincular existente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Vincular pessoa existente</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quem já tem cadastro em outro departamento ganha acesso ao {moduleLabel} sem perder a função atual.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-3"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar pelo nome..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {candidates.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  {users.length === 0 ? 'Carregando...' : 'Nenhuma pessoa disponível para vincular'}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {candidates.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name}</p>
                        <p className="text-xs text-slate-400">{ROLE_LABELS[u.role] || u.role}</p>
                      </div>
                      <button
                        onClick={() => link(u.id)}
                        disabled={linking === u.id}
                        className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {linking === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                        Vincular
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {linked.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <Check className="h-4 w-4" /> {linked.length} pessoa(s) vinculada(s)!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
