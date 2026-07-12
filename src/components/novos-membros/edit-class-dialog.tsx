'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Turma {
  id: string
  church_id: string
  name: string
  teacher_id: string | null
  start_date: string | null
  day_of_week: string | null
  time_start: string | null
  location: string | null
}

interface Props {
  turma: Turma
}

export function EditClassDialog({ turma }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])
  const [form, setForm] = useState({
    name: turma.name,
    teacher_id: turma.teacher_id || '',
    start_date: turma.start_date || '',
    day_of_week: turma.day_of_week || '',
    time_start: turma.time_start?.slice(0, 5) || '',
    location: turma.location || '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('church_id', turma.church_id)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setTeachers(data || []))
  }, [open, turma.church_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('new_members_classes')
      .update({
        name: form.name.trim(),
        teacher_id: form.teacher_id || null,
        start_date: form.start_date || null,
        day_of_week: form.day_of_week || null,
        time_start: form.time_start || null,
        location: form.location.trim() || null,
      })
      .eq('id', turma.id)

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Pencil className="h-4 w-4" />
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Editar Turma</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Nome da Turma *</label>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Professor</label>
                <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)} className={inputClass}>
                  <option value="">Selecione</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data de Início</label>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Horário</label>
                  <input type="time" value={form.time_start} onChange={e => set('time_start', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Dia da Semana</label>
                  <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} className={inputClass}>
                    <option value="">Selecione</option>
                    <option value="domingo">Domingo</option>
                    <option value="segunda">Segunda-feira</option>
                    <option value="terca">Terça-feira</option>
                    <option value="quarta">Quarta-feira</option>
                    <option value="quinta">Quinta-feira</option>
                    <option value="sexta">Sexta-feira</option>
                    <option value="sabado">Sábado</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Local</label>
                  <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Sala, endereço..." className={inputClass} />
                </div>
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
