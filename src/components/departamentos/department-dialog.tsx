'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Loader2 } from 'lucide-react'

export interface DeptForm {
  id?: string; name: string; description: string; keywords: string
  leaderMode: 'none' | 'name' | 'system'; leader_id: string; leader_name: string; leader_phone: string; active: boolean
}

interface Props {
  users: { id: string; full_name: string }[]
  initial?: Partial<DeptForm>
  /** botão "Novo departamento" (padrão), lápis compacto, ou link de texto */
  trigger?: 'new' | 'edit' | 'link'
  label?: string
  onSaved?: (id: string) => void
}

const empty: DeptForm = { name: '', description: '', keywords: '', leaderMode: 'none', leader_id: '', leader_name: '', leader_phone: '', active: true }

export function DepartmentDialog({ users, initial, trigger = 'new', label, onSaved }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DeptForm>({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof DeptForm>(k: K, v: DeptForm[K]) => setForm(p => ({ ...p, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const res = await fetch('/api/departamentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', ...form, keywords: form.keywords.split(',') }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Erro ao salvar.'); return }
    setOpen(false)
    if (!form.id) setForm({ ...empty })
    onSaved?.(data.id)
    router.refresh()
  }

  const input = 'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'
  const lbl = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <>
      {trigger === 'edit' ? (
        <button onClick={() => { setForm({ ...empty, ...initial }); setOpen(true) }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Pencil className="h-4 w-4" /> Editar
        </button>
      ) : trigger === 'link' ? (
        <button onClick={() => { setForm({ ...empty, ...initial }); setOpen(true) }} className="text-xs font-semibold text-violet-700 hover:underline">{label || 'Criar'}</button>
      ) : (
        <button onClick={() => { setForm({ ...empty, ...initial }); setOpen(true) }} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          <Plus className="h-4 w-4" /> {label || 'Novo departamento'}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{form.id ? 'Editar departamento' : 'Novo departamento'}</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className={lbl}>Nome *</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Louvor, Diaconato, Kids" className={input} />
              </div>
              <div>
                <label className={lbl}>Outros nomes que as pessoas escrevem <span className="text-slate-400 font-normal">(separe por vírgula)</span></label>
                <input value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="Ex: música, banda, ministério de louvor" className={input} />
                <p className="text-[11px] text-slate-500 mt-1">O sistema usa isso para sugerir quem escreveu esses nomes no link do GCA.</p>
              </div>
              <div>
                <label className={lbl}>Descrição <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input value={form.description} onChange={e => set('description', e.target.value)} className={input} />
              </div>
              <div>
                <label className={lbl}>Líder</label>
                <select value={form.leaderMode} onChange={e => set('leaderMode', e.target.value as DeptForm['leaderMode'])} className={input}>
                  <option value="none">Sem líder definido</option>
                  <option value="name">Só o nome (não acessa o sistema)</option>
                  <option value="system">Com acesso ao sistema (login)</option>
                </select>
                {form.leaderMode === 'name' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input value={form.leader_name} onChange={e => set('leader_name', e.target.value)} placeholder="Nome do líder" className={input} />
                    <input value={form.leader_phone} onChange={e => set('leader_phone', e.target.value)} placeholder="WhatsApp" className={input} />
                  </div>
                )}
                {form.leaderMode === 'system' && (
                  <>
                    <select value={form.leader_id} onChange={e => set('leader_id', e.target.value)} className={`${input} mt-2`}>
                      <option value="">— Escolha o usuário —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Não está na lista? Crie o login no cartão “Líderes de departamento” (cargo Líder de Departamento) e volte aqui.</p>
                  </>
                )}
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="h-4 w-4 accent-violet-600" />
                  Ativo (o link de cadastro só funciona com o departamento ativo)
                </label>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
