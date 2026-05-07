import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileShell } from '@/components/layout/mobile-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'viewer'

  if (role === 'counselor') {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? '/'
    if (!pathname.startsWith('/conselheiros')) {
      redirect('/conselheiros')
    }

    const { data: church } = await supabase
      .from('churches')
      .select('name')
      .eq('id', profile!.church_id)
      .single()

    return (
      <MobileShell
        userName={profile?.full_name ?? 'Conselheiro'}
        churchName={church?.name ?? 'Igreja'}
      >
        {children}
      </MobileShell>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
