import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { DeptSignupForm } from './dept-signup-form'

export const dynamic = 'force-dynamic'

/** Link de cadastro de um departamento (o líder manda para a equipe). */
export default async function DepartamentoCadastroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const supabase = createAdminClient()
  const { data: dept } = await supabase
    .from('departments').select('id, name, description, active, church_id, leader_name, leader:leader_id(full_name)')
    .eq('signup_token', token).maybeSingle()
  if (!dept) notFound()
  const { data: church } = await supabase.from('churches').select('name').eq('id', dept.church_id).single()
  const leader = (dept.leader as any)?.full_name || dept.leader_name

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3"><span className="text-2xl">🙌</span></div>
          {church && <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900">{dept.name}</h1>
          {leader && <p className="text-xs text-slate-500 mt-0.5">Líder: {leader}</p>}
          {dept.description && <p className="text-sm text-slate-500 mt-1">{dept.description}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {dept.active
            ? <DeptSignupForm token={token} deptName={dept.name} />
            : <p className="text-center text-slate-500 py-6">Este link não está recebendo cadastros no momento.</p>}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
