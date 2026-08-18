'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Search, Users } from 'lucide-react'
import type { Audience } from '@/lib/survey'

interface Entry {
  key: string
  leaderName: string
  gcaName: string
  token: string
  hostName?: string
}

export function LeaderPicker({ entries, audience }: { entries: Entry[]; audience: Audience }) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Entry | null>(null)
  const [copied, setCopied] = useState(false)

  const link = picked && typeof window !== 'undefined'
    ? `${window.location.origin}/pesquisa/${picked.token}`
    : ''

  // Quando a pesquisa é para MEMBROS, o líder só distribui o link
  const leaderOnlyShares = audience === 'membros'

  const filtered = entries.filter(e =>
    search.length < 2 ||
    e.leaderName.toLowerCase().includes(search.toLowerCase()) ||
    e.gcaName.toLowerCase().includes(search.toLowerCase())
  )

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (picked) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
          <p className="text-xs text-violet-500 uppercase font-semibold tracking-wide">Você selecionou</p>
          <p className="text-base font-bold text-violet-900">{picked.leaderName}</p>
          <p className="text-sm text-violet-700">🏠 {picked.gcaName}</p>
        </div>

        {leaderOnlyShares ? (
          <>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-bold text-amber-900 mb-1">📤 Envie este link para os membros do seu GCA</p>
              <p className="text-xs text-amber-700">
                Esta pesquisa é <strong>para os membros responderem</strong>. Copie o link abaixo e mande no grupo do seu GCA.
                Você (líder) não precisa preencher.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
              <p className="text-xs text-slate-500 break-all">{link}</p>
            </div>

            <button
              onClick={copy}
              className={`w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-colors ${
                copied ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {copied ? <><Check className="h-5 w-5" /> Link copiado!</> : <><Copy className="h-5 w-5" /> Copiar link do meu GCA</>}
            </button>
          </>
        ) : (
          <>
            <a
              href={link}
              className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 hover:bg-violet-700"
            >
              <ExternalLink className="h-5 w-5" /> Responder agora
            </a>
            <button
              onClick={copy}
              className={`w-full h-11 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 ${
                copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {copied ? <><Check className="h-4 w-4" /> Link copiado!</> : <><Copy className="h-4 w-4" /> Copiar link para responder depois</>}
            </button>
          </>
        )}

        <button
          onClick={() => { setPicked(null); setCopied(false) }}
          className="w-full text-sm text-slate-400 hover:text-slate-600"
        >
          ← Escolher outro nome
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-bold text-slate-900 mb-1">Encontre seu nome</p>
        <p className="text-sm text-slate-500">
          {leaderOnlyShares
            ? 'Selecione seu nome para pegar o link exclusivo do seu GCA e enviar aos membros.'
            : 'Selecione seu nome para abrir a pesquisa do seu GCA.'}
        </p>
      </div>

      {entries.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou GCA..."
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">Nenhum líder encontrado</p>
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map(e => (
            <button
              key={e.key}
              onClick={() => setPicked(e)}
              className="w-full text-left rounded-xl border-2 border-slate-200 px-4 py-3 hover:border-violet-400 hover:bg-violet-50/50 transition-all"
            >
              <p className="text-sm font-bold text-slate-900">{e.leaderName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3" /> {e.gcaName}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
