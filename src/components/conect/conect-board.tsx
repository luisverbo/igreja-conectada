'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Phone, Loader2, PhoneCall, BookOpen, UserCheck, Clock, Inbox, X, Check, BadgeCheck, Home } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/roles'

export interface ConectPerson {
  id: string
  full_name: string
  phone: string | null
  origin: string | null
  neighborhood: string | null
  created_at: string
  assigned_to: string | null
  assigned_name: string | null
  last_contact: { result: string; note: string | null; wants_nm: boolean | null; created_at: string; by: string | null } | null
  contacts: number
  in_waitlist: boolean
  /** GCA em que a pessoa já está (veio pelo link do GCA) */
  gca_name: string | null
}

interface Props {
  people: ConectPerson[]
  isManager: boolean
  myId: string
  staff: { id: string; full_name: string; role: string }[]
  classes: { id: string; name: string; enrollment_open: boolean; day_of_week: string | null; time_start: string | null }[]
}

const RESULTS = [
  { value: 'conversou', label: '📞 Conversei por ligação' },
  { value: 'mensagem', label: '💬 Falei por mensagem' },
  { value: 'presencial', label: '🤝 Conversei pessoalmente' },
  { value: 'nao_atendeu', label: '🔕 Não atendeu' },
]
const RESULT_SHORT: Record<string, string> = { conversou: 'Ligação', mensagem: 'Mensagem', presencial: 'Pessoalmente', nao_atendeu: 'Não atendeu' }
const DAY: Record<string, string> = { domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb' }

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
/** Precisa de atenção: com responsável e sem conversa há 3+ dias (ou nunca contatado depois de 3 dias) */
const needsAttention = (p: ConectPerson) =>
  !!p.assigned_to && !p.in_waitlist && (p.last_contact ? daysSince(p.last_contact.created_at) >= 7 : daysSince(p.created_at) >= 3)

type Tab = 'sem' | 'acomp' | 'atencao' | 'querem' | 'meus' | 'gca' | 'todos'

export function ConectBoard({ people, isManager, myId, staff, classes }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(isManager ? 'sem' : 'meus')
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<{ id: string; kind: 'contato' | 'nm' | 'dispensa' } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [contact, setContact] = useState({ result: '', wantsNm: '' as '' | 'sim' | 'nao', note: '' })

  const counts = useMemo(() => ({
    sem: people.filter(p => !p.assigned_to).length,
    acomp: people.filter(p => p.assigned_to).length,
    atencao: people.filter(needsAttention).length,
    querem: people.filter(p => p.last_contact?.wants_nm && !p.in_waitlist).length,
    meus: people.filter(p => p.assigned_to === myId).length,
    gca: people.filter(p => p.gca_name).length,
    todos: people.length,
  }), [people, myId])

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return people
      .filter(p => {
        if (tab === 'sem') return !p.assigned_to
        if (tab === 'acomp') return !!p.assigned_to
        if (tab === 'atencao') return needsAttention(p)
        if (tab === 'querem') return !!p.last_contact?.wants_nm && !p.in_waitlist
        if (tab === 'meus') return p.assigned_to === myId
        if (tab === 'gca') return !!p.gca_name
        return true
      })
      .filter(p => !term || `${p.full_name} ${p.phone || ''} ${p.neighborhood || ''} ${p.assigned_name || ''} ${p.gca_name || ''}`.toLowerCase().includes(term))
  }, [people, tab, q, myId])

  async function call(personId: string, payload: Record<string, unknown>, okText: string) {
    setBusy(personId)
    setMsg(null)
    const res = await fetch('/api/conect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, ...payload }) })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMsg({ id: personId, text: data.error || 'Erro. Tente novamente.', ok: false }); return false }
    setMsg({ id: personId, text: typeof okText === 'string' ? okText : 'Feito!', ok: true })
    setPanel(null)
    router.refresh()
    return data
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'sem', label: 'Sem responsável', show: isManager },
    { key: 'atencao', label: 'Precisam de contato', show: true },
    { key: 'querem', label: 'Querem Novos Membros', show: true },
    { key: 'acomp', label: 'Em acompanhamento', show: isManager },
    { key: 'meus', label: 'Comigo', show: true },
    { key: 'gca', label: 'Já estão em GCA', show: true },
    { key: 'todos', label: 'Todos', show: isManager },
  ]

  async function dispensar(personIds: string[], mode: 'ja_fez' | 'membro_antigo') {
    setBulkBusy(true)
    setBulkMsg(null)
    const res = await fetch('/api/conect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dispensarNm', mode, personIds }) })
    const data = await res.json().catch(() => ({}))
    setBulkBusy(false)
    if (!res.ok) { setBulkMsg(data.error || 'Erro. Tente novamente.'); return }
    setBulkMsg(`${data.count} ${data.count === 1 ? 'pessoa saiu' : 'pessoas saíram'} da caixa (${mode === 'ja_fez' ? 'já fizeram Novos Membros' : 'membros antigos, dispensados'}).`)
    setSelected(new Set())
    setPanel(null)
    router.refresh()
  }

  const allVisibleSelected = list.length > 0 && list.every(p => selected.has(p.id))

  const wa = (phone: string) => {
    const d = phone.replace(/\D/g, '')
    return `https://wa.me/${d.length <= 11 ? '55' + d : d}`
  }

  return (
    <div className="space-y-4">
      {/* Números */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'Sem responsável', value: counts.sem, icon: Inbox, color: 'text-red-600', bg: 'bg-red-50', tab: 'sem' as Tab, show: isManager },
          { label: 'Precisam de contato', value: counts.atencao, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'atencao' as Tab, show: true },
          { label: 'Querem Novos Membros', value: counts.querem, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'querem' as Tab, show: true },
          { label: isManager ? 'Em acompanhamento' : 'Comigo', value: isManager ? counts.acomp : counts.meus, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: (isManager ? 'acomp' : 'meus') as Tab, show: true },
        ].filter(s => s.show).map(s => {
          const Icon = s.icon
          return (
            <button key={s.label} onClick={() => setTab(s.tab)}
              className={`rounded-xl border bg-white p-3 sm:p-4 text-left flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 ${tab === s.tab ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
              <span className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} /></span>
              <span>
                <span className="block text-lg sm:text-xl font-bold text-slate-900 leading-none sm:leading-normal">{s.value}</span>
                <span className="block text-[11px] sm:text-xs text-slate-500 leading-tight mt-1 sm:mt-0">{s.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Abas + busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
          {tabs.filter(t => t.show).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border ${tab === t.key ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome, telefone, bairro"
            className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>

      {/* Seleção em lote */}
      {list.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={allVisibleSelected}
              onChange={e => setSelected(e.target.checked ? new Set(list.map(p => p.id)) : new Set())} />
            Selecionar todos desta lista ({list.length})
          </label>
          {bulkMsg && <p className="text-xs font-medium text-emerald-700">✓ {bulkMsg}</p>}
        </div>
      )}
      {selected.size > 0 && (
        <div className="sticky top-14 lg:top-0 z-20 rounded-xl border-2 border-violet-300 bg-violet-50 p-3 shadow-sm">
          <p className="text-sm font-bold text-violet-900 mb-2">{selected.size} selecionada(s) — não precisam de Novos Membros:</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={bulkBusy} onClick={() => dispensar([...selected], 'ja_fez')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />} Já fizeram Novos Membros
            </button>
            <button disabled={bulkBusy} onClick={() => dispensar([...selected], 'membro_antigo')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Membros antigos (dispensar)
            </button>
            <button onClick={() => setSelected(new Set())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
          {tab === 'sem' ? 'Ninguém aguardando responsável 🎉' : 'Ninguém aqui por enquanto.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map(p => {
            const lc = p.last_contact
            const open = panel?.id === p.id
            return (
              <div key={p.id} className={`rounded-xl border bg-white ${!p.assigned_to ? 'border-red-200' : needsAttention(p) ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <input type="checkbox" aria-label={`Selecionar ${p.full_name}`} className="mt-1 h-4 w-4 flex-shrink-0 accent-violet-600"
                      checked={selected.has(p.id)}
                      onChange={e => setSelected(prev => { const n = new Set(prev); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n })} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/pessoas/${p.id}`} className="font-semibold text-slate-900 hover:text-violet-700">{p.full_name}</Link>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.origin === 'veio_de_outra_igreja' ? 'bg-sky-50 text-sky-700' : 'bg-pink-50 text-pink-700'}`}>
                          {p.origin === 'veio_de_outra_igreja' ? '⛪ Veio de outra igreja' : '🙏 Aceitou Jesus'}
                        </span>
                        <span className="text-[11px] text-slate-400">chegou {timeAgo(p.created_at)}</span>
                        {p.neighborhood && <span className="text-[11px] text-slate-400">· {p.neighborhood}</span>}
                        {p.gca_name && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"><Home className="h-3 w-3" /> {p.gca_name}</span>}
                        {p.in_waitlist && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">⏳ Na fila de Novos Membros</span>}
                      </div>
                    </div>
                    {p.phone && (
                      <a href={wa(p.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 active:bg-emerald-100">
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Responsável */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
                    <span className="text-xs font-medium text-slate-500">Responsável:</span>
                    {isManager ? (
                      <select
                        value={p.assigned_to || ''}
                        disabled={busy === p.id}
                        onChange={e => call(p.id, { action: 'assign', assignedTo: e.target.value || null }, e.target.value ? 'Responsável definido — avisamos pelo WhatsApp.' : 'Responsável removido.')}
                        className={`h-9 rounded-lg border px-2 text-sm max-w-full ${p.assigned_to ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50 text-red-700 font-semibold'}`}
                      >
                        <option value="">— Escolher quem vai acompanhar —</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({ROLE_LABELS[s.role] || s.role})</option>)}
                      </select>
                    ) : (
                      <span className="font-semibold text-slate-700">{p.assigned_name || '—'}</span>
                    )}
                    {busy === p.id && <Loader2 className="h-4 w-4 animate-spin text-violet-500" />}
                  </div>

                  {/* Último contato */}
                  <p className={`mt-2 text-xs ${lc ? 'text-slate-600' : 'text-slate-400'}`}>
                    {lc
                      ? <>Último contato: <strong>{RESULT_SHORT[lc.result] || lc.result}</strong> {timeAgo(lc.created_at)}{lc.by ? ` · ${lc.by}` : ''}{p.contacts > 1 ? ` · ${p.contacts} contatos` : ''}
                          {lc.wants_nm === true && <span className="text-blue-700 font-semibold"> · quer Novos Membros</span>}
                          {lc.note && <span className="block text-slate-500 italic mt-0.5">“{lc.note}”</span>}</>
                      : 'Nenhum contato registrado ainda'}
                  </p>

                  {msg?.id === p.id && (
                    <p className={`mt-2 text-xs font-medium ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.ok ? '✓ ' : ''}{msg.text}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 border-t border-slate-100 px-3.5 py-2 flex-wrap">
                  <button onClick={() => { setPanel(open && panel?.kind === 'contato' ? null : { id: p.id, kind: 'contato' }); setContact({ result: '', wantsNm: '', note: '' }) }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <PhoneCall className="h-3.5 w-3.5" /> Registrar contato
                  </button>
                  <button onClick={() => setPanel(open && panel?.kind === 'nm' ? null : { id: p.id, kind: 'nm' })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                    <BookOpen className="h-3.5 w-3.5" /> Quer fazer Novos Membros
                  </button>
                  <button onClick={() => setPanel(open && panel?.kind === 'dispensa' ? null : { id: p.id, kind: 'dispensa' })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <BadgeCheck className="h-3.5 w-3.5" /> Não precisa de Novos Membros
                  </button>
                </div>

                {/* Painel: não precisa de NM */}
                {open && panel?.kind === 'dispensa' && (
                  <div className="border-t border-slate-100 bg-emerald-50/50 p-3.5 space-y-2 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Por que não precisa?</p>
                      <button onClick={() => setPanel(null)} className="text-slate-400" aria-label="Fechar"><X className="h-4 w-4" /></button>
                    </div>
                    <button disabled={bulkBusy} onClick={() => dispensar([p.id], 'ja_fez')}
                      className="w-full rounded-lg border-2 border-emerald-200 bg-white px-3 py-2.5 text-left text-sm hover:border-emerald-400">
                      <span className="font-semibold text-slate-900">✅ Já fez Novos Membros</span>
                      <span className="block text-xs text-slate-500">Fez o curso antes — registra como concluído.</span>
                    </button>
                    <button disabled={bulkBusy} onClick={() => dispensar([p.id], 'membro_antigo')}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-left text-sm hover:border-slate-400">
                      <span className="font-semibold text-slate-900">🏛️ Membro antigo — dispensado</span>
                      <span className="block text-xs text-slate-500">É da igreja de antes do curso existir; não precisa fazer.</span>
                    </button>
                    <p className="text-[11px] text-slate-500">A pessoa sai da caixa do Conect{p.gca_name ? ` e continua no ${p.gca_name}` : ''}.</p>
                  </div>
                )}

                {/* Painel: registrar contato */}
                {open && panel?.kind === 'contato' && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3.5 space-y-3 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Como foi o contato?</p>
                      <button onClick={() => setPanel(null)} className="text-slate-400" aria-label="Fechar"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {RESULTS.map(r => (
                        <button key={r.value} type="button" onClick={() => setContact(c => ({ ...c, result: r.value }))}
                          className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold ${contact.result === r.value ? 'border-violet-600 bg-white text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                    {contact.result && contact.result !== 'nao_atendeu' && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">Quer fazer o curso de Novos Membros?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[['sim', 'Sim'], ['nao', 'Agora não'], ['', 'Não perguntei']].map(([v, l]) => (
                            <button key={l} type="button" onClick={() => setContact(c => ({ ...c, wantsNm: v as any }))}
                              className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold ${contact.wantsNm === v ? 'border-violet-600 bg-white text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <textarea value={contact.note} onChange={e => setContact(c => ({ ...c, note: e.target.value }))} rows={2}
                      placeholder="Observação (opcional) — pedido de oração, melhor horário, como está..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <button
                      disabled={!contact.result || busy === p.id}
                      onClick={async () => {
                        const ok = await call(p.id, { action: 'contact', result: contact.result, wantsNm: contact.wantsNm === 'sim' ? true : contact.wantsNm === 'nao' ? false : null, note: contact.note }, 'Contato registrado.')
                        // Quer NM? já abre a escolha da turma
                        if (ok && contact.wantsNm === 'sim') setPanel({ id: p.id, kind: 'nm' })
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar contato
                    </button>
                  </div>
                )}

                {/* Painel: Novos Membros */}
                {open && panel?.kind === 'nm' && (
                  <div className="border-t border-slate-100 bg-blue-50/50 p-3.5 space-y-2 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Encaminhar para Novos Membros</p>
                      <button onClick={() => setPanel(null)} className="text-slate-400" aria-label="Fechar"><X className="h-4 w-4" /></button>
                    </div>
                    {classes.filter(c => c.enrollment_open).map(c => (
                      <button key={c.id} disabled={busy === p.id}
                        onClick={() => call(p.id, { action: 'novosMembros', classId: c.id }, `Matriculado(a) na ${c.name} — enviamos as boas-vindas da turma.`)}
                        className="w-full rounded-lg border-2 border-blue-200 bg-white px-3 py-2.5 text-left text-sm hover:border-blue-400">
                        <span className="font-semibold text-slate-900">Matricular na {c.name}</span>
                        {c.day_of_week && <span className="text-xs text-slate-500"> · {DAY[c.day_of_week] || c.day_of_week}{c.time_start ? ` ${c.time_start.slice(0, 5)}` : ''}</span>}
                      </button>
                    ))}
                    <button disabled={busy === p.id || p.in_waitlist}
                      onClick={() => call(p.id, { action: 'novosMembros' }, 'Colocado(a) na fila de espera — Gabriel e Márcia já veem em Novos Membros.')}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 text-left text-sm disabled:opacity-50">
                      <span className="font-semibold text-slate-900">⏳ Colocar na fila de espera</span>
                      <span className="block text-xs text-slate-500">{p.in_waitlist ? 'Já está na fila.' : 'Entra automaticamente na próxima turma aberta.'}</span>
                    </button>
                    {classes.filter(c => c.enrollment_open).length === 0 && (
                      <p className="text-xs text-slate-500">Nenhuma turma com inscrições abertas agora — use a fila de espera.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Aparece aqui quem chegou (aceitou Jesus ou veio de outra igreja) e ainda não entrou em Novos Membros. Ao matricular numa turma, a pessoa sai da caixa.
      </p>
    </div>
  )
}
