'use client'

import { Church, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface MobileShellProps {
  children: React.ReactNode
  userName: string
  churchName: string
}

export function MobileShell({ children, userName, churchName }: MobileShellProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Header fixo */}
      <header style={{ background: 'var(--sidebar-bg)' }} className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
              <Church className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">{churchName}</p>
              <p className="text-xs text-violet-300 leading-none mt-0.5">Olá, {userName.split(' ')[0]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-violet-300 hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto pb-8">
        {children}
      </main>
    </div>
  )
}
