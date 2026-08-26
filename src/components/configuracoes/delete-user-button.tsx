'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  userId: string
  userName: string
  compact?: boolean
}

export function DeleteUserButton({ userId, userName, compact = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [impact, setImpact] = useState<{ asLeader: string[]; asSupervisor: string[] } | null>(null)

  async function openDialog() {
    setOpen(true)
    setChecking(true)
    setError(null)
    const res = await fetch(`/api/admin/delete-user?userId=${userId}`)
    const data = await res.json()
    setChecking(false)
    if (!res.ok) { setError(data.error || 'Erro ao verificar.'); return }
    setImpact({ asLeader: data.asLeader || [], asSupervisor: data.asSupervisor || [] })
  }

  async function confirm() {
    setDeleting(true)
    setError(null)
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) { setError(data.error || 'Erro ao excluir.'); return }
    setOpen(false)
    router.refresh()
  }

  const orphanGcas = [...(impact?.asLeader || []), ...(impact?.asSupervisor || [])]

  return (
    <>
      <button
        onClick={openDialog}
        title="Excluir usuário"
        className={compact
          ? 'text-slate-400 hover:text-red-500 transition-colors'
          : 'flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors'}
      >
        <Trash2 className="h-4 w-4" />
        {!compact && 'Excluir'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Excluir usuário</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {checking ? (
                <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" /></div>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Excluir {userName}?</p>
                      <p>Ele perde o acesso ao sistema imediatamente. O histórico que ele registrou (presenças, observações, cadastros) é mantido.</p>
                    </div>
                  </div>

                  {orphanGcas.length > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                      <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ Atenção: GCA sem responsável</p>
                      <p className="text-xs text-amber-800">
                        {impact!.asLeader.length > 0 && <>Ele é <strong>líder</strong> de: {impact!.asLeader.join(', ')}. </>}
                        {impact!.asSupervisor.length > 0 && <>É <strong>supervisor</strong> de: {impact!.asSupervisor.join(', ')}. </>}
                        Esses GCAs ficarão sem responsável — defina um novo líder depois.
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirm}
                      disabled={deleting || !!error && !impact}
                      className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700"
                    >
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Excluindo...</> : 'Sim, excluir'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
