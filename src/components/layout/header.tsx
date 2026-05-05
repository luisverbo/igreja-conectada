'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  title: string
  description?: string
  userName?: string
  userRole?: string
}

export function Header({ title, description, userName = 'Usuário', userRole }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9 w-56 h-9 text-sm" placeholder="Buscar pessoa..." />
        </div>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500" />
        </button>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-semibold">
            {getInitials(userName)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700 leading-none">{userName}</p>
            {userRole && <p className="text-xs text-slate-500 mt-0.5">{userRole}</p>}
          </div>
        </div>
      </div>
    </header>
  )
}
