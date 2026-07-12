'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Discipleship {
  id: string
  church_id: string
  name: string
  leader_id: string | null
  supervisor_id: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  day_of_week: string | null
  time_start: string | null
  meeting_frequency: string | null
  notes: string | null
  status: string
}

interface Props {
  discipleship: Discipleship
}

export function EditDiscipleshipDialog({ discipleship }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaders, setLeaders] = useState<{ id: string; full_name: string }[]>([])
  const [form, setForm] = useState({
    name: discipleship.name,
    leader_id: discipleship.leader_id || '',
    supervisor_id: discipleship.supervisor_id || '',
    address: discipleship.address || '',
    neighborhood: discipleship.neighborhood || '',
    city: discipleship.city || '',
    day_of_week: discipleship.day_of_week || '',
    time_start: discipleship.time_start?.slice(0, 5) || '',
    meeting_frequency: discipleship.meeting_frequency || 'semanal',
    notes: discipleship.notes || '',
    status: discipleship.status,
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('church_id', discipleship.church_id)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setLeaders(data || []))
  }, [open, discipleship.church_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Re-geocode only when the address actually changed
    let latitude: number | undefined
    let longitude: number | undefined
    const addressChanged =
      form.address !== (discipleship.address || '') ||
      form.city !== (discipleship.city || '') ||
      form.neighborhood !== (discipleship.neighborhood || '')

    if (addressChanged && form.address && form.city) {
      try {
        const query = encodeURIComponent(`${form.address}, ${form.neighborhood || ''} ${form.city} Brasil`)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
          { headers: { 'User-Agent': 'IgrejaConectada/1.0' } }
        )
        const geoData = await res.json()
        if (Array.isArray(geoData) && geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat)
          longitude = parseFloat(geoData[0].lon)
        }
      } catch {
        // silently ignore geocoding errors
      }
    }

    const { error: updateError } = await supabase
      .from('discipleships')
      .update({
        name: form.name.trim(),
        leader_id: form.leader_id || null,
        supervisor_id: form.supervisor_id || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        day_of_week: form.day_of_week || null,
        time_start: form.time_start || null,
        meeting_frequency: form.meeting_frequency,
        notes: form.notes.trim() || null,
        status: form.status,
        ...(latitude !== undefined ? { latitude, longitude } : {}),
      })
      .eq('id', discipleship.id)

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
        <Pencil className="h-4 w-4 mr-2" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Editar Discipulado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Discipulado *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Líder</Label>
                <Select value={form.leader_id} onChange={e => set('leader_id', e.target.value)} placeholder="Selecione">
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)} placeholder="Selecione">
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
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
              <Label>Status</Label>
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
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
