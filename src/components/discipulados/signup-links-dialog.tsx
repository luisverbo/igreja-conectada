'use client'

import { useState, useEffect } from 'react'
import { Link2, X, Copy, Check, MessageCircle, Search, Users } from 'lucide-react'

export interface GcaLinkItem {
  id: string
  name: string
  leaders: string | null
  leaderPhone: string | null
  token: string
}

interface Props {
  churchToken: string
  gcas: GcaLinkItem[]
}

function waUrl(text: string, phone?: string | null) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits && digits.length <= 11) digits = '55' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/**
 * Todos os links de cadastro numa tela só: o geral (a pessoa escolhe o
 * GCA) e um por GCA, cada um com copiar e enviar pelo WhatsApp — sem
 * precisar entrar GCA por GCA.
 */
export function SignupLinksDialog({ churchToken, gcas }: Props) {
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const generalUrl = `${origin}/cadastro/gcas/${churchToken}`
  const gcaUrl = (g: GcaLinkItem) => `${origin}/cadastro/gca/${g.token}`

  const memberMsg = (url: string, gcaName?: string) =>
    `Olá, família${gcaName ? ` do ${gcaName}` : ''}! 🙌\n\nEstamos atualizando o cadastro dos nossos GCAs. Leva 1 minutinho: preencha seus dados neste link 👇\n\n${url}`

  const leaderMsg = (g: GcaLinkItem) =>
    `Olá${g.leaders ? `, ${g.leaders}` : ''}! Este é o link de cadastro do *${g.name}*. Envie no grupo do seu GCA para cada pessoa preencher os próprios dados:\n\n${gcaUrl(g)}`

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(key)
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1800)
  }

  const allText = `📋 *Links de cadastro dos GCAs*\nCada líder envia o link do SEU GCA no grupo:\n\n` +
    gcas.map(g => `🏠 *${g.name}*${g.leaders ? ` (${g.leaders})` : ''}\n${gcaUrl(g)}`).join('\n\n')

  const q = search.trim().toLowerCase()
  const list = q ? gcas.filter(g => `${g.name} ${g.leaders || ''}`.toLowerCase().includes(q)) : gcas

  const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Link2 className="h-4 w-4" /> Links de cadastro
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Links de cadastro dos membros</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  A pessoa preenche nome, WhatsApp e endereço — e já entra vinculada ao GCA.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Link geral */}
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4">
                <p className="text-sm font-bold text-violet-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Link geral — a pessoa escolhe o GCA dela
                </p>
                <p className="text-xs text-violet-700/80 mt-0.5 mb-2">Um link só para todos. Bom para avisos gerais e grupos da igreja.</p>
                <code className="block text-xs bg-white border border-violet-100 rounded-lg px-3 py-2 text-slate-700 break-all">{generalUrl}</code>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => copy(generalUrl, 'geral')} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>
                    {copied === 'geral' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === 'geral' ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <a href={waUrl(memberMsg(generalUrl))} target="_blank" rel="noopener noreferrer" className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar pelo WhatsApp
                  </a>
                </div>
              </div>

              {/* Um por GCA */}
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <p className="text-sm font-bold text-slate-900">Link de cada GCA ({gcas.length})</p>
                  <button onClick={() => copy(allText, 'todos')} className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
                    {copied === 'todos' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === 'todos' ? 'Lista copiada!' : 'Copiar todos (para o grupo de líderes)'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Quem se cadastra pelo link de um GCA já entra direto nele. <strong>Enviar ao líder</strong> abre o WhatsApp do líder com o link pronto.
                </p>

                {gcas.length > 6 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar GCA ou líder"
                      className="w-full h-9 rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                )}

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {list.map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">🏠 {g.name}</p>
                        {g.leaders && <p className="text-xs text-slate-500 truncate">{g.leaders}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => copy(gcaUrl(g), g.id)} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                          {copied === g.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied === g.id ? 'Copiado' : 'Copiar'}
                        </button>
                        <a
                          href={g.leaderPhone ? waUrl(leaderMsg(g), g.leaderPhone) : waUrl(memberMsg(gcaUrl(g), g.name))}
                          target="_blank" rel="noopener noreferrer"
                          title={g.leaderPhone ? 'Abre a conversa com o líder' : 'Líder sem WhatsApp cadastrado — escolha o contato no WhatsApp'}
                          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> {g.leaderPhone ? 'Enviar ao líder' : 'WhatsApp'}
                        </a>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhum GCA encontrado</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Card do link de UM GCA — na página do próprio GCA (o líder também vê). */
export function GcaSignupLinkCard({ gcaName, token }: { gcaName: string; token: string }) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const url = `${origin}/cadastro/gca/${token}`
  const msg = `Olá, família do ${gcaName}! 🙌\n\nEstamos atualizando o cadastro do nosso GCA. Leva 1 minutinho: preencha seus dados neste link 👇\n\n${url}`

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-violet-900 flex items-center gap-1.5"><Link2 className="h-4 w-4" /> Link de cadastro deste GCA</p>
        <p className="text-xs text-violet-700/80">Envie no grupo: cada pessoa preenche os próprios dados e já entra no GCA.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
            setCopied(true); setTimeout(() => setCopied(false), 1800)
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado!' : 'Copiar link'}
        </button>
        <a href={waUrl(msg)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
          <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
        </a>
      </div>
    </div>
  )
}
