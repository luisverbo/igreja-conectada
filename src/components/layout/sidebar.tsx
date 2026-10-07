'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, Menu, X, Search,
  Home, BarChart3, Settings, ChevronRight, Church, LogOut, Building2, HeartHandshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const allNavItems = [
  { key: 'dashboard', label: 'Dashboard', short: 'Início', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'counselor_leader', 'counselor_full', 'new_members_leader', 'new_members_teacher', 'new_members_helper', 'discipleship_supervisor', 'discipleship_leader', 'viewer'] },
  { key: 'pessoas', label: 'Pessoas', short: 'Pessoas', href: '/pessoas', icon: Users, description: 'Jornada espiritual', roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'viewer'] },
  { key: 'conselheiros', label: 'Conselheiros', short: 'Conselho', href: '/conselheiros', icon: HeartHandshake, description: 'Cultos e decisões', roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'counselor_leader', 'counselor_full'] },
  { key: 'novos-membros', label: 'Novos Membros', short: 'N. Membros', href: '/novos-membros', icon: BookOpen, description: 'Turmas e presença', roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'new_members_leader', 'new_members_teacher', 'new_members_helper', 'viewer'] },
  { key: 'discipulados', label: 'GCA', short: 'GCA', href: '/discipulados', icon: Home, description: 'Grupos e acompanhamento', roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor', 'discipleship_leader', 'viewer'] },
  { key: 'relatorios', label: 'Relatórios', short: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['super_admin', 'pastor', 'coordinator', 'supervisor', 'viewer'] },
  { key: 'configuracoes', label: 'Configurações', short: 'Ajustes', href: '/configuracoes', icon: Settings, roles: ['super_admin', 'pastor', 'coordinator', 'supervisor'] },
]

interface NavProps {
  role: string
  isSuperAdmin?: boolean
  customAccess?: string[]
}

function useNav({ role, customAccess = [] }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  // Visível se o cargo permite OU se a pessoa tem acesso extra ao módulo
  const navItems = allNavItems.filter(item => item.roles.includes(role) || customAccess.includes(item.key))
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
  return { pathname, navItems, isActive, logout }
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
        <Church className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-white leading-none">Igreja</p>
        <p className="text-xs text-violet-300 leading-none mt-0.5">Conectada</p>
      </div>
    </div>
  )
}

/** Lista de itens + rodapé (Admin / Sair) — usada no menu lateral e na gaveta do celular */
function NavList({ props, onNavigate }: { props: NavProps; onNavigate?: () => void }) {
  const { navItems, isActive, logout } = useNav(props)
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors group',
                active ? 'bg-violet-600 text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-violet-400 group-hover:text-violet-200')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                {item.description && (
                  <p className={cn('text-xs truncate', active ? 'text-violet-200' : 'text-violet-400')}>{item.description}</p>
                )}
              </div>
              {active && <ChevronRight className="h-3 w-3 text-violet-200" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--sidebar-border)' }}>
        {props.isSuperAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-amber-300 hover:bg-white/10 hover:text-amber-200 transition-colors"
          >
            <Building2 className="h-4 w-4 text-amber-400" />
            <span>Painel Admin</span>
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-violet-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 text-violet-400" />
          <span>Sair</span>
        </button>
      </div>
    </>
  )
}

/** Menu lateral — só no computador (lg+) */
export function Sidebar(props: NavProps) {
  return (
    <aside className="hidden lg:flex h-full w-64 flex-shrink-0 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Brand />
      </div>
      <NavList props={props} />
    </aside>
  )
}

/**
 * Navegação do celular: barra superior (marca, busca, menu), gaveta com
 * todos os itens e barra inferior com os atalhos principais.
 */
export function MobileNav(props: NavProps) {
  const { pathname, navItems, isActive } = useNav(props)
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')
  const router = useRouter()

  // Fecha a gaveta ao trocar de página e trava o scroll do fundo enquanto aberta
  useEffect(() => { setOpen(false); setSearching(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Barra inferior: até 4 atalhos + "Menu"
  const tabs = navItems.filter(i => i.key !== 'configuracoes').slice(0, 4)
  const canSearch = navItems.some(i => i.key === 'pessoas')

  return (
    <>
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 h-14 flex-shrink-0"
        style={{ background: 'var(--sidebar-bg)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        {searching ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={e => {
              e.preventDefault()
              if (q.trim()) router.push(`/pessoas?q=${encodeURIComponent(q.trim())}`)
              setQ('')
              setSearching(false)
            }}
          >
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar pessoa..."
              className="flex-1 h-9 rounded-lg bg-white/10 px-3 text-base text-white placeholder:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button type="button" onClick={() => setSearching(false)} className="p-2 text-violet-200" aria-label="Fechar busca">
              <X className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <>
            <Link href="/dashboard"><Brand /></Link>
            <div className="flex items-center gap-1">
              {canSearch && (
                <button onClick={() => setSearching(true)} className="p-2 rounded-lg text-violet-200 active:bg-white/10" aria-label="Buscar pessoa">
                  <Search className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-violet-200 active:bg-white/10" aria-label="Abrir menu">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Gaveta */}
      <div className={cn('lg:hidden fixed inset-0 z-50 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <aside
          className={cn(
            'absolute right-0 top-0 h-full w-[82%] max-w-xs flex flex-col shadow-2xl transition-transform duration-200',
            open ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{ background: 'var(--sidebar-bg)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
            <Brand />
            <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-violet-200" aria-label="Fechar menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <NavList props={props} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Barra inferior */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {tabs.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0">
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-violet-100')}>
                  <Icon className={cn('h-5 w-5', active ? 'text-violet-700' : 'text-slate-500')} />
                </span>
                <span className={cn('text-[11px] leading-tight truncate max-w-full px-1', active ? 'font-semibold text-violet-700' : 'text-slate-500')}>
                  {item.short}
                </span>
              </Link>
            )
          })}
          <button onClick={() => setOpen(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2">
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Menu className="h-5 w-5 text-slate-500" />
            </span>
            <span className="text-[11px] leading-tight text-slate-500">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
