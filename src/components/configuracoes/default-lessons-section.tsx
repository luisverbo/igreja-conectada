'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, Check, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
}

interface LessonTemplate { title: string; title2: string }

export function DefaultLessonsSection({ churchId }: Props) {
  const [lessons, setLessons] = useState<LessonTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('churches').select('nm_default_lessons').eq('id', churchId).single()
    const arr = Array.isArray(data?.nm_default_lessons) ? data!.nm_default_lessons : []
    setLessons(arr.map((l: any) => ({ title: l.title || '', title2: l.title2 || '' })))
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  function setLesson(i: number, k: keyof LessonTemplate, v: string) {
    setLessons(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }
  function add() { setLessons(prev => [...prev, { title: '', title2: '' }]) }
  function remove(i: number) { setLessons(prev => prev.filter((_, idx) => idx !== i)) }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const clean = lessons.filter(l => l.title.trim()).map(l => ({ title: l.title.trim(), title2: l.title2.trim() || undefined }))
    await supabase.from('churches').update({ nm_default_lessons: clean.length > 0 ? clean : null }).eq('id', churchId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputClass = "flex-1 h-9 rounded-lg border border-slate-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  if (loading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" /></div>

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Defina as aulas padrão do curso de Novos Membros. Toda turma nova já vem com estas aulas
        (o líder ajusta datas e professores em cada turma). Cada encontro pode ter até 2 matérias.
      </p>

      {lessons.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center mb-3">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma aula padrão — novas turmas usam &ldquo;Aula 1, 2, 3...&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {lessons.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-violet-600 uppercase w-12 flex-shrink-0">Dia {i + 1}</span>
              <input value={l.title} onChange={e => setLesson(i, 'title', e.target.value)} placeholder="Matéria 1" className={inputClass} />
              <input value={l.title2} onChange={e => setLesson(i, 'title2', e.target.value)} placeholder="Matéria 2 (opcional)" className={inputClass} />
              <button onClick={() => remove(i)} className="text-slate-300 hover:text-red-500 p-1.5 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={add} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Plus className="h-4 w-4" /> Adicionar aula
        </button>
        <button onClick={save} disabled={saving} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${saved ? 'bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Salvo!' : 'Salvar modelo'}
        </button>
      </div>
    </div>
  )
}
