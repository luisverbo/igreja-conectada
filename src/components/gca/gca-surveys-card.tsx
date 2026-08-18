'use client'

import { useState } from 'react'
import { ClipboardList, Copy, Check, ExternalLink } from 'lucide-react'
import { AUDIENCE_META, type Audience } from '@/lib/survey'

interface SurveyItem {
  token: string
  title: string
  description: string | null
  audience: Audience
  responses: number
}

/**
 * Pesquisas vinculadas a ESTE GCA — o líder pega aqui o link exclusivo
 * do grupo dele (para responder ou repassar aos membros).
 */
export function GcaSurveysCard({ surveys }: { surveys: SurveyItem[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/pesquisa/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2500)
  }

  if (surveys.length === 0) return null

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-bold text-slate-900">Pesquisas deste GCA</h3>
        <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-bold">{surveys.length}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Links exclusivos deste GCA — as respostas ficam registradas separadamente.
      </p>

      <div className="space-y-2">
        {surveys.map(s => {
          const meta = AUDIENCE_META[s.audience]
          const forMembers = s.audience === 'membros'
          return (
            <div key={s.token} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.title}</p>
                  <p className="text-xs text-slate-500">{meta?.emoji} {meta?.label} · {s.responses} resposta(s)</p>
                </div>
              </div>
              {forMembers && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 my-2">
                  📤 Copie e envie no grupo dos membros — o líder não responde esta.
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => copy(s.token)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    copied === s.token ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  {copied === s.token ? <><Check className="h-3.5 w-3.5" /> Link copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar link deste GCA</>}
                </button>
                {!forMembers && (
                  <a
                    href={`/pesquisa/${s.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Responder
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
