'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, AlertCircle, GraduationCap } from 'lucide-react'
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
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([])
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    day_of_week: '',
    time_start: '',
    location: '',
    total_lessons: '4',
    close_after_lesson: '',
  })
  // teacher per lesson index (0-based)
  const [lessonTeachers, setLessonTeachers] = useState<Record<number, string>>({})

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setTeachers(data || []))
  }, [open, churchId])

  function close() {
    setOpen(false)
    setError(null)
    setForm({ name: '', start_date: '', day_of_week: '', time_start: '', location: '', total_lessons: '4', close_after_lesson: '' })
    setLessonTeachers({})
  }

  const totalLessons = parseInt(form.total_lessons) || 4

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
        teacher_id: lessonTeachers[0] || userId,
        start_date: form.start_date || null,
        day_of_week: form.day_of_week || null,
        time_start: form.time_start || null,
        location: form.location.trim() || null,
        total_lessons: totalLessons,
        status: 'ativa',
        enrollment_open: true,
        close_after_lesson: form.close_after_lesson ? parseInt(form.close_after_lesson) : null,
        created_by: userId,
      })
      .select()
      .single()

    if (insertError || !cls) {
      setError(insertError?.message || 'Erro ao criar turma. Tente novamente.')
      setLoading(false)
      return
    }

    // Create standard lessons with per-lesson teacher
    const lessons = Array.from({ length: totalLessons }, (_, i) => ({
      class_id: cls.id,
      lesson_number: i + 1,
      title: `Aula ${i + 1}`,
      status: 'pendente',
      teacher_id: lessonTeachers[i] || null,
    }))
    const { error: lessonsError } = await supabase.from('new_members_lessons').insert(lessons)
    if (lessonsError) {
      setError('Turma criada, mas houve erro ao criar as aulas. Atualize a página.')
      setLoading(false)
      return
    }

    // Auto-enroll anyone on the waiting list — fire-and-forget
    fetch('/api/novos-membros/process-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: cls.id }),
    }).catch(() => {})

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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
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

              {/* Professor por aula */}
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                  <GraduationCap className="h-4 w-4 text-violet-600" />
                  Professor de cada aula
                </p>
                <p className="text-xs text-violet-600 -mt-2">Opcional — você pode definir ou trocar depois, na página da turma.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: totalLessons }, (_, i) => (
                    <div key={i}>
                      <label className="block text-xs font-semibold text-violet-800 mb-1">Aula {i + 1}</label>
                      <select
                        value={lessonTeachers[i] || ''}
                        onChange={e => setLessonTeachers(p => ({ ...p, [i]: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-violet-200 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Definir depois</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Janela de inscrição */}
              <div>
                <label className={labelClass}>Inscrições abertas até</label>
                <select value={form.close_after_lesson} onChange={e => set('close_after_lesson', e.target.value)} className={inputClass}>
                  <option value="">Fechar manualmente</option>
                  {Array.from({ length: totalLessons }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Após a Aula {i + 1} (fecha automático)</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  A turma continua ativa após fechar — só não aceita novas inscrições pelo link/QR code.
                </p>
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
