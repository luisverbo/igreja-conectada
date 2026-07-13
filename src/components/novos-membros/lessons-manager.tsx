'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, Pencil, Check, X, Ban, RotateCcw, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Lesson {
  id: string
  lesson_number: number
  title: string
  title2: string | null
  lesson_date: string | null
  status: string
  teacher_id: string | null
}

interface Props {
  lessons: Lesson[]
  teachers: { id: string; full_name: string }[]
  canManage: boolean
}

export function LessonsManager({ lessons, teachers, canManage }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<any>({})

  const teacherName = (id: string | null) => teachers.find(t => t.id === id)?.full_name

  function startEdit(l: Lesson) {
    setEditing(l.id)
    setDraft({
      title: l.title || '',
      title2: l.title2 || '',
      lesson_date: l.lesson_date || '',
      teacher_id: l.teacher_id || '',
      status: l.status,
    })
  }

  async function save(lessonId: string) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('new_members_lessons').update({
      title: draft.title.trim() || null,
      title2: draft.title2.trim() || null,
      lesson_date: draft.lesson_date || null,
      teacher_id: draft.teacher_id || null,
      status: draft.status,
    }).eq('id', lessonId)

    // (Re)agenda lembrete do professor 1 dia antes
    fetch('/api/novos-membros/schedule-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    }).catch(() => {})

    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  async function quickStatus(lessonId: string, status: string) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('new_members_lessons').update({ status }).eq('id', lessonId)
    fetch('/api/novos-membros/schedule-lesson', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    }).catch(() => {})
    setSaving(false)
    router.refresh()
  }

  const statusBadge = (s: string) =>
    s === 'realizada' ? 'bg-emerald-100 text-emerald-700'
    : s === 'cancelada' ? 'bg-red-100 text-red-600'
    : 'bg-slate-100 text-slate-500'
  const statusLabel = (s: string) =>
    s === 'realizada' ? 'Realizada' : s === 'cancelada' ? 'Cancelada' : 'Agendada'

  const inputClass = "w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-violet-600" />
        <h2 className="text-base font-bold text-slate-900">Cronograma de Aulas</h2>
        <span className="text-xs text-slate-400">— defina a data e o professor de cada encontro</span>
      </div>

      <div className="divide-y divide-slate-100">
        {lessons.map(l => {
          const isEditing = editing === l.id
          return (
            <div key={l.id} className={`px-4 sm:px-5 py-3 ${l.status === 'cancelada' ? 'bg-red-50/40' : ''}`}>
              {isEditing ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-600 uppercase w-14 flex-shrink-0">Dia {l.lesson_number}</span>
                    <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Matéria 1" className={inputClass} />
                    <input value={draft.title2} onChange={e => setDraft({ ...draft, title2: e.target.value })} placeholder="Matéria 2 (opcional)" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-16">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Data</label>
                      <input type="date" value={draft.lesson_date} onChange={e => setDraft({ ...draft, lesson_date: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Professor</label>
                      <select value={draft.teacher_id} onChange={e => setDraft({ ...draft, teacher_id: e.target.value })} className={inputClass}>
                        <option value="">Sem professor</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Situação</label>
                      <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} className={inputClass}>
                        <option value="pendente">Agendada</option>
                        <option value="realizada">Realizada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-16">
                    <button onClick={() => save(l.id)} disabled={saving} className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
                    </button>
                    <button onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-violet-600 uppercase w-14 flex-shrink-0">Dia {l.lesson_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {l.title}{l.title2 && <span className="text-slate-400 font-normal"> · {l.title2}</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {l.lesson_date ? formatDate(l.lesson_date) : <span className="text-amber-500">sem data</span>}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {teacherName(l.teacher_id) || <span className="text-amber-500">sem professor</span>}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${statusBadge(l.status)}`}>{statusLabel(l.status)}</span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {l.status === 'cancelada' ? (
                        <button onClick={() => quickStatus(l.id, 'pendente')} title="Reativar" className="text-slate-400 hover:text-emerald-600 p-1.5">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => quickStatus(l.id, 'cancelada')} title="Cancelar este dia" className="text-slate-400 hover:text-red-500 p-1.5">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => startEdit(l)} title="Editar" className="text-slate-400 hover:text-violet-600 p-1.5">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          📲 O professor recebe um lembrete no WhatsApp um dia antes da aula (se tiver telefone cadastrado).
        </p>
      </div>
    </div>
  )
}
