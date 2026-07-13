'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, X, GraduationCap, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
  canEdit: boolean
}

export function TeachersSection({ churchId, canEdit }: Props) {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('nm_teachers')
      .select('*')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('name')
    setTeachers(data || [])
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Informe o nome.'); return }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: insErr } = await supabase.from('nm_teachers').insert({
      church_id: churchId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      active: true,
    })
    setSaving(false)
    if (insErr) { setError('Erro ao salvar: ' + insErr.message); return }
    setOpen(false)
    setForm({ name: '', phone: '' })
    load()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('nm_teachers').update({ active: false }).eq('id', id)
    load()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900">Professores das Aulas</h3>
          {teachers.length > 0 && (
            <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-bold">{teachers.length}</span>
          )}
        </div>
        {canEdit && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Só nome e WhatsApp — o professor <strong>não acessa o sistema</strong>, apenas recebe o lembrete da aula um dia antes.
      </p>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" /></div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Nenhum professor cadastrado ainda</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {teachers.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                {t.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  {t.phone ? <><Phone className="h-3 w-3" />{t.phone}</> : <span className="text-amber-500">sem telefone (não recebe lembrete)</span>}
                </p>
              </div>
              {canEdit && (
                <button onClick={() => remove(t.id)} title="Remover" className="text-slate-300 hover:text-red-500 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Novo Professor</h2>
              <button onClick={() => { setOpen(false); setError(null) }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do professor" className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className={inputClass} />
                <p className="text-xs text-slate-400 mt-1">Para receber o lembrete da aula um dia antes.</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setOpen(false); setError(null) }} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
