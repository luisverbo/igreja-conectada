import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { EnrollmentForm } from './enrollment-form'

export default async function PublicEnrollmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: turma } = await supabase
    .from('new_members_classes')
    .select('id, name, day_of_week, time_start, location, total_lessons, status, church_id, teacher_id, teacher:profiles!new_members_classes_teacher_id_fkey(full_name)')
    .eq('registration_token', token)
    .single()

  if (!turma || turma.status !== 'ativa') notFound()

  const { data: church } = await supabase
    .from('churches')
    .select('name, city, state')
    .eq('id', turma.church_id)
    .single()

  const dayLabels: Record<string, string> = {
    domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
    quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          {church && (
            <p className="text-sm font-medium text-violet-600 mb-1">
              {church.name}{church.city ? ` · ${church.city}` : ''}
            </p>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{turma.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {(turma as any).teacher?.full_name && (
              <span>👤 {(turma as any).teacher.full_name}</span>
            )}
            {turma.day_of_week && (
              <span>📅 {dayLabels[turma.day_of_week] || turma.day_of_week}</span>
            )}
            {turma.time_start && (
              <span>🕐 {(turma.time_start as string).slice(0, 5)}</span>
            )}
            {turma.location && (
              <span>📍 {turma.location}</span>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Inscrição</h2>
          <p className="text-sm text-slate-500 mb-6">Preencha seus dados para se inscrever na turma.</p>
          <EnrollmentForm classId={turma.id} churchId={turma.church_id} token={token} />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
