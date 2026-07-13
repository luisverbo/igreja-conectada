import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FichaForm } from './ficha-form'

export const dynamic = 'force-dynamic'

// Universal per-class link. The student fills their own ficha.
// A logged-in volunteer sees a banner and can fill on someone's behalf.
export default async function FichaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: turma } = await admin
    .from('new_members_classes')
    .select('id, name, status, church_id')
    .eq('registration_token', token)
    .single()

  if (!turma) notFound()

  const { data: church } = await admin
    .from('churches')
    .select('name, city, state')
    .eq('id', turma.church_id)
    .single()

  // Is a logged-in team member opening this? Then allow "fill on behalf"
  let volunteer: { id: string; full_name: string } | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, church_id')
        .eq('id', user.id)
        .single()
      if (prof && prof.church_id === turma.church_id) {
        volunteer = { id: prof.id, full_name: prof.full_name }
      }
    }
  } catch { /* anonymous student */ }

  if (turma.status !== 'ativa') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 mb-4"><span className="text-2xl">🔒</span></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Turma encerrada</h1>
          <p className="text-slate-500">A ficha da turma <strong>{turma.name}</strong> não está mais disponível.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">📋</span>
          </div>
          {church && (
            <p className="text-sm font-medium text-violet-600 mb-1">
              {church.name}{church.city ? ` · ${church.city}${church.state ? `/${church.state}` : ''}` : ''}
            </p>
          )}
          <h1 className="text-2xl font-bold text-slate-900">Ficha de Novos Membros</h1>
          <p className="text-sm text-slate-500 mt-1">Turma: <strong>{turma.name}</strong></p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <FichaForm
            token={token}
            churchName={church?.name || ''}
            turmaName={turma.name}
            filledBy={volunteer?.id}
            volunteerName={volunteer?.full_name}
          />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
