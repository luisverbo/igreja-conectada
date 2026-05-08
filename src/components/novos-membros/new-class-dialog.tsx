'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
  userId: string
}

export function NewClassDialog({ churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    day_of_week: '',
    time_start: '',
    location: '',
    total_lessons: '4',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function close() {
    setOpen(false)
    setError(null)
    setForm({ name: '', start_date: '', day_of_week: '', time_start: '', location: '', total_lessons: '4' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: cls, error: insertError } = await supabase
      .from('new_members_classes')
      .insert({
        church_id: churchId,
        name: form.name.trim(),
        teacher_id: userId,
        start_date: form.start_date || null,
        day_of_week: form.day_of_week || null,
        time_start: form.time_start || null,
        location: form.location.trim() || null,
        total_lessons: parseInt(form.total_lessons) || 4,
        status: 'ativa',
        created_by: userId,
      })
      .select()
      .single()

    if (insertError || !cls) {
      setError(insertError?.message || 'Erro ao criar turma. Tente novamente.')
      setLoading(false)
      return
    }

    // Create default lessons
    const lessons = Array.from({ length: parseInt(form.total_lessons) || 4 }, (_, i) => ({
      class_id: cls.id,
      lesson_number: i + 1,
      title: `Aula ${i + 1}`,
      status: 'pendente',
    }))
    const { error: lessonsError } = await supabase.from('new_members_lessons').insert(lessons)
    if (lessonsError) {
      setError('Turma criada, mas houve erro ao criar as aulas. Atualize a página.')
      setLoading(false)
      return
    }

    setLoading(false)
    close()
    router.refresh()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nova Turma
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Nova Turma de Novos Membros</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Nome da Turma *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ex: Turma Maio/2026"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data de Início</label>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Total de Aulas</label>
                  <select value={form.total_lessons} onChange={e => set('total_lessons', e.target.value)} className={inputClass}>
                    {[3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} aulas</option>)}
                  </select>
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
                  <label className={labelClass}>Horário</label>
                  <input type="time" value={form.time_start} onChange={e => set('time_start', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Local</label>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Sala, endereço..." className={inputClass} />
              </div>

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
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
