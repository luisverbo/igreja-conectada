'use client'

import { useState } from 'react'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  turmaId: string
  turmaName: string
  studentCount: number
}

export function DeleteClassButton({ turmaId, turmaName, studentCount }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Reset enrolled people back to 'novo' before wiping enrollment history
    const { data: enrollments } = await supabase
      .from('new_members_enrollments')
      .select('person_id')
      .eq('class_id', turmaId)

    if (enrollments) {
      for (const e of enrollments) {
        await supabase.from('people')
          .update({ status: 'novo' })
          .eq('id', e.person_id)
          .eq('status', 'em_novos_membros')
      }
    }

    // Delete in dependency order: attendance → enrollments → lessons → class
    const { data: lessonRows } = await supabase
      .from('new_members_lessons')
      .select('id')
      .eq('class_id', turmaId)
    const lessonIds = lessonRows?.map(l => l.id) || []

    if (lessonIds.length > 0) {
      await supabase.from('new_members_attendance').delete().in('lesson_id', lessonIds)
    }
    await supabase.from('new_members_enrollments').delete().eq('class_id', turmaId)
    await supabase.from('new_members_lessons').delete().eq('class_id', turmaId)
    const { error: deleteError } = await supabase.from('new_members_classes').delete().eq('id', turmaId)

    if (deleteError) {
      setError('Erro ao excluir: ' + deleteError.message)
      setLoading(false)
      return
    }

    window.location.href = '/novos-membros'
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Excluir turma"
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Excluir Turma</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Esta ação não pode ser desfeita.</p>
                  <p>
                    A turma <strong>{turmaName}</strong>
                    {studentCount > 0 && <>, suas <strong>{studentCount} matrícula(s)</strong></>} e todo o
                    histórico de presença serão excluídos permanentemente.
                    {studentCount > 0 && ' Os alunos matriculados voltarão ao status "Novo".'}
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Excluindo...</> : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
