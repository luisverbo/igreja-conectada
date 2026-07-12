'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, AlertCircle } from 'lucide-react'

interface UserRow {
  id: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
}

import { ROLE_LABELS, MODULES } from '@/lib/roles'

interface Props {
  user: UserRow & { custom_access?: string[] | null }
  allowedRoles?: string[]
  allowCustomAccess?: boolean
}

const ALL_ROLES = [
  'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_full', 'counselor_leader',
  'new_members_leader', 'new_members_teacher', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader', 'viewer',
]

export function EditUserDialog({ user, allowedRoles, allowCustomAccess = false }: Props) {
  const ROLE_OPTIONS = (allowedRoles || ALL_ROLES).map(r => ({ value: r, label: ROLE_LABELS[r] || r }))
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: user.full_name,
    phone: user.phone || '',
    role: user.role,
    is_active: user.is_active,
  })
  const [customAccess, setCustomAccess] = useState<string[]>(user.custom_access || [])

  function toggleAccess(key: string) {
    setCustomAccess(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
        is_active: form.is_active,
        ...(allowCustomAccess ? { custom_access: customAccess } : {}),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao atualizar usuário.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar usuário"
        className="text-slate-400 hover:text-violet-600 transition-colors"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Editar Usuário</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Função</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className={inputClass}
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {allowCustomAccess && (
                <div>
                  <label className={labelClass}>Acessos adicionais</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MODULES.map(m => (
                      <label key={m.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        customAccess.includes(m.key) ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={customAccess.includes(m.key)}
                          onChange={() => toggleAccess(m.key)}
                          className="h-3.5 w-3.5 accent-violet-600"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Abas extras além do que a função permite.</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Conta ativa</p>
                  <p className="text-xs text-slate-500">Usuários inativos não conseguem acessar o sistema</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-violet-600' : 'bg-slate-300'}`}
                  role="switch"
                  aria-checked={form.is_active}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
