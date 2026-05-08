'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Trash2, CheckCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  turmaId: string
  turmaStatus: string
  canManage: boolean
}

export function CompleteClassButton({ turmaId, turmaStatus, canManage }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!canManage || turmaStatus !== 'ativa') return null

  async function handleComplete() {
    setLoading(true)
    const supabase = createClient()

    // Mark all enrolled students as completed
    await supabase
      .from('new_members_enrollments')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('class_id', turmaId)
      .eq('completed', false)

    // Update class status
    await supabase
      .from('new_members_classes')
      .update({ status: 'concluida', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', turmaId)

    // Update all enrolled people's status to concluiu_novos_membros
    const { data: enrollments } = await supabase
      .from('new_members_enrollments')
      .select('person_id')
      .eq('class_id', turmaId)

    if (enrollments) {
      for (const e of enrollments) {
        await supabase.from('people').update({ status: 'concluiu_novos_membros' }).eq('id', e.person_id)
        await supabase.from('journey_events').insert({
          person_id: e.person_id,
          event_type: 'concluiu_novos_membros',
          recorded_by: null,
        })
      }
    }

    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <GraduationCap className="h-4 w-4" />
        Concluir Turma
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
      <span className="text-sm text-emerald-800 font-medium">Concluir e formar todos os alunos?</span>
      <button
        onClick={handleComplete}
        disabled={loading}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-emerald-500 hover:text-emerald-700">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface RemoveEnrollmentProps {
  enrollmentId: string
  personId: string
  personName: string
}

export function RemoveEnrollmentButton({ enrollmentId, personId, personName }: RemoveEnrollmentProps) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('new_members_attendance').delete().eq('enrollment_id', enrollmentId)
    await supabase.from('new_members_enrollments').delete().eq('id', enrollmentId)
    await supabase.from('people').update({ status: 'novo' }).eq('id', personId)
    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} title="Remover da turma" className="text-slate-400 hover:text-red-500 transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1">
      <span className="text-xs text-red-700">Remover {personName}?</span>
      <button onClick={handleRemove} disabled={loading} className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sim'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-red-400 hover:text-red-600">Não</button>
    </div>
  )
}

interface MarkCompleteProps {
  enrollmentId: string
  personId: string
  completed: boolean
}

export function MarkStudentCompleteButton({ enrollmentId, personId, completed }: MarkCompleteProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    const now = !completed
    await supabase
      .from('new_members_enrollments')
      .update({ completed: now, completed_at: now ? new Date().toISOString() : null })
      .eq('id', enrollmentId)
    if (now) {
      await supabase.from('people').update({ status: 'concluiu_novos_membros' }).eq('id', personId)
      await supabase.from('journey_events').insert({ person_id: personId, event_type: 'concluiu_novos_membros' })
    } else {
      await supabase.from('people').update({ status: 'em_novos_membros' }).eq('id', personId)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={completed ? 'Marcar como em curso' : 'Marcar como concluído'}
      className={`transition-colors disabled:opacity-60 ${completed ? 'text-emerald-600 hover:text-slate-400' : 'text-slate-300 hover:text-emerald-500'}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
    </button>
  )
}
