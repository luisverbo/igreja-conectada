'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Users, Search } from 'lucide-react'

interface Target { token: string; gcaName: string; responses: number }

export function LeadersHubLink({ token, audience }: { token: string; audience: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/pesquisa/lideres/${token}` : ''

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-bold text-violet-900">Link único para o grupo de líderes</h3>
      </div>
      <p className="text-xs text-violet-700 mb-3">
        {audience === 'membros'
          ? 'Mande este link no grupo dos líderes. Cada um escolhe o próprio nome e recebe o link exclusivo do GCA dele para repassar aos membros.'
          : 'Mande este link no grupo dos líderes. Cada um escolhe o próprio nome e já abre a pesquisa do GCA dele.'}
      </p>
      <div className="rounded-lg bg-white border border-violet-100 px-3 py-2 mb-3">
        <p className="text-xs text-slate-500 break-all">{url}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            copied ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {copied ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar link do grupo</>}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="h-10 px-3 rounded-lg border border-violet-200 bg-white text-sm font-semibold text-violet-700 flex items-center gap-1.5 hover:bg-violet-50">
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      </div>
    </div>
  )
}

export function TargetLinksList({ targets }: { targets: Target[] }) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function copy(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/pesquisa/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const filtered = targets.filter(t => search.length < 2 || t.gcaName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h3 className="text-sm font-bold text-slate-900">Link individual de cada GCA</h3>
        <span className="text-xs text-slate-400">{targets.length} GCA(s) vinculado(s)</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Cada GCA tem seu link próprio — as respostas ficam separadas por GCA.
      </p>

      {targets.length > 6 && (
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar GCA..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {filtered.map(t => (
          <div key={t.token} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">🏠 {t.gcaName}</p>
              <p className="text-xs text-slate-400">{t.responses} resposta(s)</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => copy(t.token)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  copiedToken === t.token ? 'bg-emerald-100 text-emerald-700' : 'border border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                {copiedToken === t.token ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Link</>}
              </button>
              <a
                href={`/pesquisa/${t.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-violet-600 p-1.5"
                title="Abrir"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
