'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { CertificateCanvas } from '@/components/certificados/certificate-canvas'
import { tidyName } from '@/lib/certificate'

const MAX = 22

export function CertificateForm({ token, templateKey }: { token: string; templateKey: string }) {
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name1.trim() || !name2.trim()) { setError('Preencha os dois nomes do casal.'); return }
    setLoading(true)
    const res = await fetch('/api/certificado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name1, name2 }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar. Tente novamente.'); return }
    setDone(true)
  }

  const input = 'w-full h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700'

  return (
    <div className="space-y-4">
      {/* Prévia ao vivo */}
      <div className="rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white">
        <CertificateCanvas templateKey={templateKey} name1={tidyName(name1)} name2={tidyName(name2)} />
      </div>

      {done ? (
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-slate-900">Certificado enviado! 🙌</h2>
          <p className="text-sm text-slate-600 mt-1">
            O certificado de <strong>{tidyName(name1)} &amp; {tidyName(name2)}</strong> foi enviado para a liderança, que vai imprimir e entregar.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-sm text-blue-900">
            ✍️ Escreva <strong>só o primeiro nome</strong> de cada um (ou o nome composto, ex.: <em>Luís Carlos</em>). O nome aparece no certificado enquanto você digita.
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">1º nome — primeiro nome *</label>
            <input value={name1} onChange={e => setName1(e.target.value.slice(0, MAX))} placeholder="Ex: Luís Carlos" autoComplete="off" className={input} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">2º nome — primeiro nome *</label>
            <input value={name2} onChange={e => setName2(e.target.value.slice(0, MAX))} placeholder="Ex: Meire" autoComplete="off" className={input} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-blue-900 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-blue-950">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Enviar certificado
          </button>
        </form>
      )}
    </div>
  )
}
