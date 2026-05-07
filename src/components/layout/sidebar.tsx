'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Heart, BookOpen,
  Home, BarChart3, Settings, ChevronRight, Church, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'pastor', 'coordinator', 'new_members_teacher', 'discipleship_supervisor', 'discipleship_leader', 'viewer'] },
  { label: 'Pessoas', href: '/pessoas', icon: Users, description: 'Jornada espiritual', roles: ['super_admin', 'pastor', 'coordinator', 'viewer'] },
  { label: 'Conselheiros', href: '/conselheiros', icon: Heart, description: 'Cultos e decisões', roles: ['super_admin', 'pastor', 'coordinator', 'counselor', 'viewer'] },
  { label: 'Novos Membros', href: '/novos-membros', icon: BookOpen, description: 'Turmas e presença', roles: ['super_admin', 'pastor', 'coordinator', 'new_members_teacher', 'viewer'] },
  { label: 'Discipulados', href: '/discipulados', icon: Home, description: 'Acompanhamento pastoral', roles: ['super_admin', 'pastor', 'coordinator', 'discipleship_supervisor', 'discipleship_leader', 'viewer'] },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['super_admin', 'pastor', 'coordinator', 'viewer'] },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['super_admin', 'pastor', 'coordinator'] },
]

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = allNavItems.filter(item => item.roles.includes(role))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
          <Church className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Igreja</p>
          <p className="text-xs text-violet-300 leading-none mt-0.5">Conectada</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors group',
                isActive ? 'bg-violet-600 text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-violet-400 group-hover:text-violet-200')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                {item.description && (
                  <p className={cn('text-xs truncate', isActive ? 'text-violet-200' : 'text-violet-400')}>{item.description}</p>
                )}
              </div>
              {isActive && <ChevronRight className="h-3 w-3 text-violet-200" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-violet-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 text-violet-400" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
