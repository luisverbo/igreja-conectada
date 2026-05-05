'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Props {
  churchId: string
  userId: string
}

export function NewClassDialog({ churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    day_of_week: '',
    time_start: '',
    location: '',
    total_lessons: '4',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { data: cls } = await supabase
      .from('new_members_classes')
      .insert({
        church_id: churchId,
        name: form.name,
        teacher_id: userId,
        start_date: form.start_date || null,
        day_of_week: form.day_of_week || null,
        time_start: form.time_start || null,
        location: form.location || null,
        total_lessons: parseInt(form.total_lessons) || 4,
        status: 'ativa',
        created_by: userId,
      })
      .select()
      .single()

    if (cls) {
      // Create default lessons
      const lessons = Array.from({ length: parseInt(form.total_lessons) || 4 }, (_, i) => ({
        class_id: cls.id,
        lesson_number: i + 1,
        title: `Aula ${i + 1}`,
        status: 'pendente',
      }))
      await supabase.from('new_members_lessons').insert(lessons)
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
    setForm({ name: '', start_date: '', day_of_week: '', time_start: '', location: '', total_lessons: '4' })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Nova Turma
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Nova Turma de Novos Membros</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Turma *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Turma Maio/2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total de Aulas</Label>
                <Select value={form.total_lessons} onChange={e => set('total_lessons', e.target.value)}>
                  <option value="3">3 aulas</option>
                  <option value="4">4 aulas</option>
                  <option value="5">5 aulas</option>
                  <option value="6">6 aulas</option>
                  <option value="8">8 aulas</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} placeholder="Selecione">
                  <option value="domingo">Domingo</option>
                  <option value="segunda">Segunda-feira</option>
                  <option value="terca">Terça-feira</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="quinta">Quinta-feira</option>
                  <option value="sexta">Sexta-feira</option>
                  <option value="sabado">Sábado</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={form.time_start} onChange={e => set('time_start', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Sala, endereço..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Turma'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
