'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Heart,
  BookOpen,
  Home,
  BarChart3,
  Settings,
  ChevronRight,
  Church,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Pessoas',
    href: '/pessoas',
    icon: Users,
    description: 'Jornada espiritual',
  },
  {
    label: 'Conselheiros',
    href: '/conselheiros',
    icon: Heart,
    description: 'Cultos e decisões',
  },
  {
    label: 'Novos Membros',
    href: '/novos-membros',
    icon: BookOpen,
    description: 'Turmas e presença',
  },
  {
    label: 'Discipulados',
    href: '/discipulados',
    icon: Home,
    description: 'Acompanhamento pastoral',
  },
  {
    label: 'Relatórios',
    href: '/relatorios',
    icon: BarChart3,
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-64 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
          <Church className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Igreja</p>
          <p className="text-xs text-violet-300 leading-none mt-0.5">Conectada</p>
        </div>
      </div>

      {/* Navigation */}
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
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-violet-200 hover:bg-white/10 hover:text-white'
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

      {/* Footer */}
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
