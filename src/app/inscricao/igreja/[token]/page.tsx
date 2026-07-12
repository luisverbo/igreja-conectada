import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ChurchEnrollmentForm } from './church-enrollment-form'

export const dynamic = 'force-dynamic'

// Standing registration page — the printed QR code at church points here.
// Shows open classes when available, otherwise joins the waiting list.
export default async function ChurchEnrollmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: church } = await supabase
    .from('churches')
    .select('id, name, city, state')
    .eq('registration_token', token)
    .single()

  if (!church) notFound()

  const { data: openClasses } = await supabase
    .from('new_members_classes')
    .select('id, name, day_of_week, time_start, location, start_date')
    .eq('church_id', church.id)
    .eq('status', 'ativa')
    .eq('enrollment_open', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-4">
            <span className="text-2xl">⛪</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{church.name}</h1>
          <p className="text-sm text-violet-600 font-medium mt-1">
            Curso de Novos Membros
            {church.city ? ` · ${church.city}${church.state ? `/${church.state}` : ''}` : ''}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <ChurchEnrollmentForm
            churchId={church.id}
            token={token}
            openClasses={openClasses || []}
          />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
