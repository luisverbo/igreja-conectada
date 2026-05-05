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

interface Props {
  churchId: string
  userId: string
}

export function NewDiscipleshipDialog({ churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    day_of_week: '',
    time_start: '',
    meeting_frequency: 'semanal',
    notes: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    await supabase.from('discipleships').insert({
      church_id: churchId,
      name: form.name,
      leader_id: userId,
      address: form.address || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      day_of_week: form.day_of_week || null,
      time_start: form.time_start || null,
      meeting_frequency: form.meeting_frequency,
      notes: form.notes || null,
      status: 'ativo',
      created_by: userId,
    })

    setLoading(false)
    setOpen(false)
    router.refresh()
    setForm({ name: '', address: '', neighborhood: '', city: '', day_of_week: '', time_start: '', meeting_frequency: 'semanal', notes: '' })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Novo Discipulado
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Novo Grupo de Discipulado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Discipulado *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Discipulado Casa Verde" required />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1">
                <Label>Dia</Label>
                <Select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} placeholder="Dia">
                  <option value="domingo">Domingo</option>
                  <option value="segunda">Segunda</option>
                  <option value="terca">Terça</option>
                  <option value="quarta">Quarta</option>
                  <option value="quinta">Quinta</option>
                  <option value="sexta">Sexta</option>
                  <option value="sabado">Sábado</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={form.time_start} onChange={e => set('time_start', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.meeting_frequency} onChange={e => set('meeting_frequency', e.target.value)}>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Informações adicionais..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Discipulado'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
