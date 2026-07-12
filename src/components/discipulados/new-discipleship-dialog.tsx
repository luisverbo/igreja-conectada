'use client'

import { useState, useEffect } from 'react'
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
  const [leaders, setLeaders] = useState<{ id: string; full_name: string }[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    leader_id: '',
    leader2_mode: 'none' as 'none' | 'system' | 'name',
    leader2_id: '',
    leader2_name: '',
    supervisor_id: '',
    location_id: '',
    day_of_week: '',
    time_start: '',
    meeting_frequency: 'semanal',
    notes: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setLeaders(data || []))
    supabase
      .from('gca_locations')
      .select('*')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => setLocations(data || []))
  }, [open, churchId])

  const selectedLocation = locations.find(l => l.id === form.location_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Address comes from the linked location (keeps the map working)
    const loc = selectedLocation

    await supabase.from('discipleships').insert({
      church_id: churchId,
      name: form.name,
      leader_id: form.leader_id || userId,
      leader2_id: form.leader2_mode === 'system' ? form.leader2_id || null : null,
      leader2_name: form.leader2_mode === 'name' ? form.leader2_name.trim() || null : null,
      supervisor_id: form.supervisor_id || null,
      location_id: form.location_id || null,
      address: loc?.address || null,
      neighborhood: loc?.neighborhood || null,
      city: loc?.city || null,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
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
    setForm({ name: '', leader_id: '', leader2_mode: 'none', leader2_id: '', leader2_name: '', supervisor_id: '', location_id: '', day_of_week: '', time_start: '', meeting_frequency: 'semanal', notes: '' })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Novo GCA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Novo GCA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do GCA *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: GCA Casa Verde" required />
            </div>

            {/* Liderança — normalmente um casal (jovens pode ser 1 pessoa) */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-violet-900">Liderança do GCA 👫</p>
              <div className="space-y-2">
                <Label>Líder 1 * <span className="text-slate-400 font-normal text-xs">(tem acesso ao sistema)</span></Label>
                <Select value={form.leader_id} onChange={e => set('leader_id', e.target.value)} placeholder="Selecione" required>
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Líder 2 — cônjuge <span className="text-slate-400 font-normal text-xs">(opcional, ex: GCA de jovens pode ter só 1 líder)</span></Label>
                <Select
                  value={form.leader2_mode}
                  onChange={e => set('leader2_mode', e.target.value)}
                >
                  <option value="none">Sem segundo líder</option>
                  <option value="name">Cônjuge sem acesso ao sistema (só o nome)</option>
                  <option value="system">Cônjuge com acesso ao sistema</option>
                </Select>
                {form.leader2_mode === 'system' && (
                  <Select value={form.leader2_id} onChange={e => set('leader2_id', e.target.value)} placeholder="Selecione o cônjuge">
                    {leaders.filter(l => l.id !== form.leader_id).map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                  </Select>
                )}
                {form.leader2_mode === 'name' && (
                  <Input
                    value={form.leader2_name}
                    onChange={e => set('leader2_name', e.target.value)}
                    placeholder="Nome do cônjuge — ex: Maria Silva"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)} placeholder="Selecione">
                {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Local *</Label>
              <Select value={form.location_id} onChange={e => set('location_id', e.target.value)} placeholder="Onde acontece o GCA" required>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.location_type === 'igreja' ? '⛪' : '🏠'} {l.name}
                  </option>
                ))}
              </Select>
              {locations.length === 0 && (
                <p className="text-xs text-amber-600">Nenhum local cadastrado — crie um em &ldquo;Locais dos GCAs&rdquo; na página anterior.</p>
              )}
              {selectedLocation && (
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-800 space-y-0.5">
                  {selectedLocation.host_name && <p>🏠 Anfitrião: <strong>{selectedLocation.host_name}</strong>{selectedLocation.host_phone && ` · ${selectedLocation.host_phone}`}</p>}
                  {(selectedLocation.address || selectedLocation.neighborhood) && (
                    <p>📍 {[selectedLocation.address, selectedLocation.neighborhood, selectedLocation.city].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}
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
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar GCA'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
