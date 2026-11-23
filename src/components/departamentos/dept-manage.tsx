'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, Search, Trash2, UserPlus, Copy, MessageCircle, Link2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PersonInfo, Suggestion } from '@/lib/departments-data'

async function call(payload: Record<string, unknown>) {
  const res = await fetch('/api/departamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro. Tente novamente.')
  return data
}

/** Sugestões: quem escreveu este departamento no link do GCA — confirmar em lote */
export function SuggestionsPanel({ departmentId, suggestions }: { departmentId: string; suggestions: Suggestion[] }) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set(suggestions.map(s => s.person.id)))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { setSel(new Set(suggestions.map(s => s.person.id))) }, [suggestions])
  if (suggestions.length === 0) return null

  async function confirm() {
    setBusy(true); setMsg(null)
    try {
      const r = await call({ action: 'addMembers', departmentId, personIds: [...sel], source: 'sugestao' })
      setMsg(`${r.count} confirmada(s).`)
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-slate-900">💡 Encontramos {suggestions.length} {suggestions.length === 1 ? 'pessoa' : 'pessoas'} para confirmar</h2>
          <p className="text-xs text-slate-600 mt-0.5">Escreveram este departamento no link do GCA. Desmarque quem não for e confirme.</p>
        </div>
        <button onClick={confirm} disabled={busy || sel.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar {sel.size}
        </button>
      </div>
      {msg && <p className="text-xs font-medium text-emerald-700 mt-2">✓ {msg}</p>}
      <div className="mt-3 divide-y divide-amber-100 rounded-xl border border-amber-100 bg-white max-h-96 overflow-y-auto">
        {suggestions.map(s => (
          <label key={s.person.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600 flex-shrink-0" checked={sel.has(s.person.id)}
              onChange={e => setSel(prev => { const n = new Set(prev); if (e.target.checked) n.add(s.person.id); else n.delete(s.person.id); return n })} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 truncate">{s.person.full_name}</span>
              <span className="block text-[11px] text-slate-500 truncate">
                escreveu “{s.matchedText}”{s.person.gca ? ` · ${s.person.gca}` : ' · sem GCA'}{s.person.gcaLeaders ? ` (${s.person.gcaLeaders})` : ''}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

const SOURCE: Record<string, string> = { link: 'Link do departamento', gca: 'Link do GCA', sugestao: 'Sugestão confirmada', manual: 'Adicionado' }

/** Lista de quem serve no departamento + adicionar pessoa já cadastrada */
export function MembersList({ departmentId, members, churchId }: {
  departmentId: string; churchId: string
  members: { person: PersonInfo; source: string }[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const memberIds = useMemo(() => new Set(members.map(m => m.person.id)), [members])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.from('people').select('id, full_name, phone').eq('church_id', churchId).ilike('full_name', `%${term}%`).order('full_name').limit(8)
      setResults((data || []).filter(p => !memberIds.has(p.id)))
    }, 250)
    return () => clearTimeout(t)
  }, [q, churchId, memberIds])

  async function add(id: string) {
    setBusy(id)
    try { await call({ action: 'addMembers', departmentId, personIds: [id], source: 'manual' }); setQ(''); router.refresh() } catch { /* mensagem simples */ }
    setBusy(null)
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Tirar ${name} deste departamento?`)) return
    setBusy(id)
    try { await call({ action: 'removeMember', departmentId, personId: id }); router.refresh() } catch { /* */ }
    setBusy(null)
  }

  const f = filter.trim().toLowerCase()
  const shown = f ? members.filter(m => `${m.person.full_name} ${m.person.gca || ''} ${m.person.gcaLeaders || ''}`.toLowerCase().includes(f)) : members

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="relative">
          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Adicionar pessoa já cadastrada — digite o nome"
            className="w-full h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map(r => (
                <button key={r.id} onClick={() => add(r.id)} disabled={busy === r.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-violet-50">
                  <span>{r.full_name} <span className="text-xs text-slate-400">{r.phone || ''}</span></span>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-semibold text-violet-700">Adicionar</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {members.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por nome, GCA ou líder"
              className="w-full h-9 rounded-lg border border-slate-200 pl-9 pr-3 text-sm" />
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">{members.length === 0 ? 'Ninguém confirmado ainda. Envie o link ou confirme as sugestões.' : 'Ninguém encontrado.'}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {shown.map(m => (
            <div key={m.person.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <Link href={`/pessoas/${m.person.id}`} className="text-sm font-semibold text-slate-900 hover:text-violet-700">{m.person.full_name}</Link>
                <p className="text-xs text-slate-500 truncate">
                  {m.person.gca ? <>🏠 {m.person.gca}{m.person.gcaLeaders ? ` · Líder: ${m.person.gcaLeaders}` : ''}</> : <span className="text-amber-700">Sem GCA</span>}
                  {m.person.phone ? ` · ${m.person.phone}` : ''}
                </p>
                <p className="text-[10px] text-slate-400">{SOURCE[m.source] || m.source}</p>
              </div>
              <button onClick={() => remove(m.person.id, m.person.full_name)} disabled={busy === m.person.id} title="Tirar do departamento" className="p-2 text-slate-300 hover:text-red-600">
                {busy === m.person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Link de cadastro do departamento */
export function DeptLinkCard({ token, name, leaderPhone }: { token: string; name: string; leaderPhone: string | null }) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const url = `${origin}/departamento/${token}`
  const msg = `Olá, equipe do ${name}! 🙌\n\nEstamos organizando o cadastro de quem serve na igreja. Leva 1 minutinho: preencha neste link 👇\n\n${url}`
  const digits = (leaderPhone || '').replace(/\D/g, '')
  const wa = (to?: string) => `https://wa.me/${to ? (to.length <= 11 ? '55' + to : to) : ''}?text=${encodeURIComponent(msg)}`
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3">
      <p className="text-sm font-semibold text-violet-900 flex items-center gap-1.5"><Link2 className="h-4 w-4" /> Link de cadastro do departamento</p>
      <p className="text-xs text-violet-700/80 mb-2">Quem preencher entra direto na equipe. Se já tem cadastro na igreja, o sistema usa o mesmo.</p>
      <code className="block text-xs bg-white border border-violet-100 rounded-lg px-3 py-2 text-slate-700 break-all">{url}</code>
      <div className="flex flex-wrap gap-2 mt-2">
        <button onClick={async () => { try { await navigator.clipboard.writeText(url) } catch { /* */ } setCopied(true); setTimeout(() => setCopied(false), 1800) }}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado!' : 'Copiar link'}
        </button>
        <a href={wa()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
          <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
        </a>
        {digits && (
          <a href={wa(digits)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <MessageCircle className="h-3.5 w-3.5" /> Mandar para o líder
          </a>
        )}
      </div>
    </div>
  )
}

export function DeleteDeptButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button disabled={busy} onClick={async () => {
      if (!confirm(`Excluir o departamento ${name}? As pessoas continuam cadastradas, só saem deste departamento.`)) return
      setBusy(true)
      try { await call({ action: 'delete', id }); router.push('/departamentos'); router.refresh() } catch { setBusy(false) }
    }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Excluir
    </button>
  )
}
