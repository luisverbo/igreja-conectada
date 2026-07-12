'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Appeal {
  id: string
  name: string
  culto_date: string
  culto_type: string | null
  preacher: string | null
  theme: string | null
  notes: string | null
}

export function EditAppealDialog({ appeal }: { appeal: Appeal }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: appeal.name,
    culto_date: appeal.culto_date,
    culto_type: appeal.culto_type || '',
    preacher: appeal.preacher || '',
    theme: appeal.theme || '',
    notes: appeal.notes || '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('appeals')
      .update({
        name: form.name.trim(),
        culto_date: form.culto_date,
        culto_type: form.culto_type || null,
        preacher: form.preacher.trim() || null,
        theme: form.theme.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq('id', appeal.id)

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-1" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Editar Culto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Culto *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.culto_date} onChange={e => set('culto_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.culto_type} onChange={e => set('culto_type', e.target.value)} placeholder="Tipo">
                  <option value="domingo_manha">Domingo Manhã</option>
                  <option value="domingo_noite">Domingo Noite</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="especial">Especial</option>
                  <option value="outro">Outro</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pregador</Label>
                <Input value={form.preacher} onChange={e => set('preacher', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Input value={form.theme} onChange={e => set('theme', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DeleteAppealButton({ appealId, totalDecisions }: { appealId: string; totalDecisions: number }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    // Decisions have no cascade from appeals — remove them first
    await supabase.from('decisions').delete().eq('appeal_id', appealId)
    await supabase.from('appeals').delete().eq('id', appealId)
    setLoading(false)
    window.location.href = '/conselheiros'
  }

  if (!confirm) {
    return (
      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirm(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
      <span className="text-xs text-red-700 font-medium">
        Excluir culto{totalDecisions > 0 ? ` e ${totalDecisions} decisão(ões)` : ''}?
      </span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sim, excluir'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-red-400 hover:text-red-600">Não</button>
    </div>
  )
}

export function DeleteDecisionButton({ decisionId }: { decisionId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('decisions').delete().eq('id', decisionId)
    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} title="Excluir decisão" className="text-slate-300 hover:text-red-500 transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={handleDelete} disabled={loading} className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-60">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Excluir?'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-slate-400 hover:text-slate-600">Não</button>
    </div>
  )
}
