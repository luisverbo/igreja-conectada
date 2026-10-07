'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  title: string
  description?: string
  userName?: string
  userRole?: string
}

import { ROLE_LABELS as roleLabels } from '@/lib/roles'

export function Header({ title, description, userName = 'Usuário', userRole }: HeaderProps) {
  const router = useRouter()
  const [q, setQ] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query) {
      router.push(`/pessoas?q=${encodeURIComponent(query)}`)
      setQ('')
    }
  }

  return (
    <header className="flex min-h-14 lg:h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6 lg:py-0">
      <div className="min-w-0">
        <h1 className="text-lg font-bold lg:font-semibold text-slate-900 leading-tight truncate">{title}</h1>
        {description && <p className="text-xs lg:text-sm text-slate-500 truncate">{description}</p>}
      </div>

      {/* No celular a busca e o menu ficam na barra superior */}
      <div className="hidden lg:flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9 w-56 h-9 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
            placeholder="Buscar pessoa..."
          />
        </form>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-semibold">
            {getInitials(userName)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700 leading-none">{userName}</p>
            {userRole && <p className="text-xs text-slate-500 mt-0.5">{roleLabels[userRole] || userRole}</p>}
          </div>
        </div>
      </div>
    </header>
  )
}
