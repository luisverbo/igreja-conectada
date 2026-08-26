'use client'

import { useState } from 'react'
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  gcaId: string
  gcaName: string
  memberCount: number
  compact?: boolean
}

export function DeleteGcaButton({ gcaId, gcaName, memberCount, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Os membros voltam ao status anterior — não ficam "em discipulado"
    // de um grupo que não existe mais
    const { data: members } = await supabase
      .from('discipleship_members')
      .select('person_id')
      .eq('discipleship_id', gcaId)
      .neq('status', 'inativo')

    for (const m of members || []) {
      await supabase
        .from('people')
        .update({ status: 'concluiu_novos_membros' })
        .eq('id', m.person_id)
        .eq('status', 'em_discipulado')
    }

    // Membros, observações e vínculos de pesquisa saem junto (cascade)
    const { error: delError } = await supabase.from('discipleships').delete().eq('id', gcaId)

    if (delError) {
      setError('Erro ao excluir: ' + delError.message)
      setLoading(false)
      return
    }

    window.location.href = '/discipulados'
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Excluir GCA"
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
              <h2 className="text-base font-bold text-slate-900">Excluir GCA</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Excluir o {gcaName}?</p>
                  <p>
                    Esta ação não pode ser desfeita. Serão apagados também
                    {memberCount > 0 && <> os <strong>{memberCount} vínculo(s) de membro</strong>,</>} as
                    observações pastorais e os vínculos de pesquisa deste grupo.
                  </p>
                </div>
              </div>

              {memberCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ℹ️ As pessoas <strong>não são apagadas</strong> — elas voltam a ficar disponíveis para
                  entrar em outro GCA.
                </p>
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
                  disabled={loading}
                  className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Excluindo...</> : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
