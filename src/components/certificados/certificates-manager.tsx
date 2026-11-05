'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award, Copy, Check, MessageCircle, Download, Loader2, Eye, Pencil, Trash2, X, Lock, Unlock, Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CertificateCanvas } from './certificate-canvas'
import { CERT_TEMPLATES, coupleLabel, downloadCertificatesPdf, tidyName } from '@/lib/certificate'
import { formatDate } from '@/lib/utils'

interface Campaign { id: string; title: string; template: string; token: string; active: boolean; created_at: string }
interface Cert { id: string; campaign_id: string; name1: string; name2: string | null; created_at: string }

interface Props {
  churchId: string
  campaigns: Campaign[]
  certificates: Cert[]
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

export function CertificatesManager({ churchId, campaigns, certificates }: Props) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || '')
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [preview, setPreview] = useState<Cert | null>(null)
  const [editing, setEditing] = useState<{ id: string; name1: string; name2: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => { if (!campaigns.find(c => c.id === campaignId)) setCampaignId(campaigns[0]?.id || '') }, [campaigns, campaignId])

  const campaign = campaigns.find(c => c.id === campaignId)
  const list = useMemo(() => certificates.filter(c => c.campaign_id === campaignId), [certificates, campaignId])
  const link = campaign ? `${origin}/certificado/${campaign.token}` : ''

  async function createCampaign() {
    setCreating(true)
    setError(null)
    const supabase = createClient()
    const { data, error: e } = await supabase
      .from('certificate_campaigns')
      .insert({ church_id: churchId, title: CERT_TEMPLATES['lideranca-gca'].label, template: 'lideranca-gca' })
      .select('id')
      .single()
    setCreating(false)
    if (e) { setError('Não foi possível criar o link: ' + e.message); return }
    if (data) setCampaignId(data.id)
    router.refresh()
  }

  async function toggleActive() {
    if (!campaign) return
    const supabase = createClient()
    await supabase.from('certificate_campaigns').update({ active: !campaign.active }).eq('id', campaign.id)
    router.refresh()
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(link) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function download(items: Cert[], name: string) {
    if (!campaign || items.length === 0) return
    setProgress({ done: 0, total: items.length })
    try {
      await downloadCertificatesPdf(
        items.map(c => ({ templateKey: campaign.template, name1: c.name1, name2: c.name2 })),
        name,
        (done, total) => setProgress({ done, total }),
      )
    } finally {
      setProgress(null)
    }
  }

  async function saveEdit() {
    if (!editing) return
    if (!editing.name1.trim() || !editing.name2.trim()) { setError('Preencha os dois nomes.'); return }
    setBusy(editing.id)
    const supabase = createClient()
    const { error: e } = await supabase.from('certificates')
      .update({ name1: tidyName(editing.name1), name2: tidyName(editing.name2) })
      .eq('id', editing.id)
    setBusy(null)
    if (e) { setError('Erro ao salvar: ' + e.message); return }
    setEditing(null)
    router.refresh()
  }

  async function remove(c: Cert) {
    if (!confirm(`Excluir o certificado de ${coupleLabel(c.name1, c.name2)}?`)) return
    setBusy(c.id)
    const supabase = createClient()
    await supabase.from('certificates').delete().eq('id', c.id)
    setBusy(null)
    setSelected(prev => { const n = new Set(prev); n.delete(c.id); return n })
    router.refresh()
  }

  const allSelected = list.length > 0 && list.every(c => selected.has(c.id))
  const selectedItems = list.filter(c => selected.has(c.id))
  const waMsg = `Olá! 🙌 Para o seu certificado do *${campaign?.title || 'Treinamento'}*, escreva o primeiro nome de vocês dois neste link:\n\n${link}`
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold'

  if (!campaign) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-xl mx-auto">
        <Award className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Certificado do Treinamento de Liderança GCA</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">Crie o link e envie para os casais. Cada um escreve os nomes e o certificado fica guardado aqui para você baixar.</p>
        <button onClick={createCampaign} disabled={creating} className={`${btn} bg-blue-900 text-white hover:bg-blue-950 disabled:opacity-60`}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar link do certificado
        </button>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {campaigns.length > 1 && (
        <select value={campaignId} onChange={e => { setCampaignId(e.target.value); setSelected(new Set()) }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.title} — {formatDate(c.created_at)}</option>)}
        </select>
      )}

      {/* Link */}
      <div className="rounded-2xl border-2 border-blue-100 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-500" /> {campaign.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {campaign.active ? '🟢 Link aberto — recebendo nomes' : '🔒 Link encerrado — ninguém consegue mais enviar'}
            </p>
          </div>
          <button onClick={toggleActive} className={`${btn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
            {campaign.active ? <><Lock className="h-4 w-4" /> Encerrar link</> : <><Unlock className="h-4 w-4" /> Reabrir link</>}
          </button>
        </div>
        <code className="block mt-3 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-slate-700 break-all">{link}</code>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={copyLink} className={`${btn} bg-blue-900 text-white hover:bg-blue-950`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
            <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
          </a>
          <a href={link} target="_blank" rel="noopener noreferrer" className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <Eye className="h-4 w-4" /> Ver como o casal vê
          </a>
        </div>
      </div>

      {/* Lista + downloads */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">Certificados recebidos ({list.length})</p>
          <div className="flex flex-wrap gap-2">
            {selectedItems.length > 0 && (
              <button onClick={() => download(selectedItems, `certificados-selecionados-${slug(campaign.title)}.pdf`)} disabled={!!progress}
                className={`${btn} border border-blue-200 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-60`}>
                <Download className="h-4 w-4" /> Baixar selecionados ({selectedItems.length})
              </button>
            )}
            <button onClick={() => download(list, `certificados-${slug(campaign.title)}.pdf`)} disabled={!!progress || list.length === 0}
              className={`${btn} bg-blue-900 text-white hover:bg-blue-950 disabled:opacity-50`}>
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {progress ? `Gerando ${progress.done}/${progress.total}...` : `Baixar todos em PDF (${list.length})`}
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Ninguém preencheu ainda. Envie o link para os casais.</p>
        ) : (
          <>
            <label className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 border-b border-slate-100 cursor-pointer">
              <input type="checkbox" checked={allSelected} className="h-4 w-4 accent-blue-900"
                onChange={e => setSelected(e.target.checked ? new Set(list.map(c => c.id)) : new Set())} />
              Selecionar todos
            </label>
            <div className="divide-y divide-slate-100">
              {list.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input type="checkbox" checked={selected.has(c.id)} className="h-4 w-4 accent-blue-900 flex-shrink-0"
                    onChange={e => setSelected(prev => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} />
                  <span className="w-7 text-xs text-slate-400 flex-shrink-0">{i + 1}.</span>
                  {editing?.id === c.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input value={editing.name1} onChange={e => setEditing({ ...editing, name1: e.target.value })}
                        className="h-9 w-32 flex-1 rounded-lg border border-slate-200 px-2 text-sm" />
                      <span className="text-slate-400">&amp;</span>
                      <input value={editing.name2} onChange={e => setEditing({ ...editing, name2: e.target.value })}
                        className="h-9 w-32 flex-1 rounded-lg border border-slate-200 px-2 text-sm" />
                      <button onClick={saveEdit} disabled={busy === c.id} className={`${btn} bg-blue-900 text-white py-1.5`}>
                        {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                      </button>
                      <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-600" aria-label="Cancelar"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{coupleLabel(c.name1, c.name2)}</p>
                        <p className="text-[11px] text-slate-400">Enviado em {formatDate(c.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setPreview(c)} title="Ver certificado" className="p-2 text-slate-400 hover:text-blue-900"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => download([c], `certificado-${slug(coupleLabel(c.name1, c.name2))}.pdf`)} disabled={!!progress}
                          title="Baixar PDF" className="p-2 text-slate-400 hover:text-blue-900"><Download className="h-4 w-4" /></button>
                        <button onClick={() => setEditing({ id: c.id, name1: c.name1, name2: c.name2 || '' })} title="Corrigir nomes"
                          className="p-2 text-slate-400 hover:text-blue-900"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(c)} disabled={busy === c.id} title="Excluir" className="p-2 text-slate-400 hover:text-red-600">
                          {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {error && <p className="text-sm text-red-600 px-4 pb-3">{error}</p>}
      </div>

      {/* Prévia */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setPreview(null)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 text-white">
              <p className="text-sm font-semibold">{coupleLabel(preview.name1, preview.name2)}</p>
              <button onClick={() => setPreview(null)} className="p-1.5" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-lg overflow-hidden shadow-2xl bg-white">
              <CertificateCanvas templateKey={campaign.template} name1={preview.name1} name2={preview.name2} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
