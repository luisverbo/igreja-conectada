'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface NewAppealDialogProps {
  churchId: string
  userId: string
}

export function NewAppealDialog({ churchId, userId }: NewAppealDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    culto_date: new Date().toISOString().split('T')[0],
    culto_type: '',
    preacher: '',
    theme: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('appeals').insert({
      church_id: churchId,
      name: form.name,
      culto_date: form.culto_date,
      culto_type: form.culto_type || null,
      preacher: form.preacher || null,
      theme: form.theme || null,
      notes: form.notes || null,
      created_by: userId,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Registrar Culto
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Registrar Culto / Apelo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Culto *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Culto de Domingo 05/05/2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.culto_date} onChange={e => set('culto_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.culto_type} onChange={e => set('culto_type', e.target.value)} placeholder="Tipo do culto">
                  <option value="domingo_manha">Domingo Manhã</option>
                  <option value="domingo_noite">Domingo Noite</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="especial">Culto Especial</option>
                  <option value="outro">Outro</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pregador</Label>
                <Input value={form.preacher} onChange={e => set('preacher', e.target.value)} placeholder="Nome do pregador" />
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Input value={form.theme} onChange={e => set('theme', e.target.value)} placeholder="Tema da mensagem" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Registrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
