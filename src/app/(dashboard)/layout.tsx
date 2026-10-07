import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionProfile } from '@/lib/get-profile'
import { Sidebar, MobileNav } from '@/components/layout/sidebar'
import { MobileShell } from '@/components/layout/mobile-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSessionProfile()

  if (!user) redirect('/login')

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    redirect('/login')
  }

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

  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'luisverbo@gmail.com'
  const isSuperAdmin = role === 'super_admin' && user.email === SUPER_ADMIN_EMAIL

  return (
    // Celular: a página rola normalmente (barra superior fixa + barra
    // inferior). Computador (lg+): menu lateral fixo e só o conteúdo rola.
    <div className="min-h-screen bg-slate-50 lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar role={role} isSuperAdmin={isSuperAdmin} customAccess={profile?.custom_access || []} />
      <MobileNav role={role} isSuperAdmin={isSuperAdmin} customAccess={profile?.custom_access || []} />
      <div className="flex flex-1 flex-col lg:overflow-hidden min-w-0">
        <main className="flex-1 lg:overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
