import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, LogOut, LayoutDashboard } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'luisverbo@gmail.com'
  if (profile?.role !== 'super_admin' || user.email !== SUPER_ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Igreja Conectada</p>
            <p className="text-xs text-slate-400">Painel Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Igrejas
          </Link>
        </nav>

        <div className="border-t border-slate-800 px-3 py-4 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-white">{profile.full_name}</p>
            <p className="text-xs text-violet-400">Super Admin</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Voltar ao App
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
