'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Props {
  appealId: string
  churchId: string
  userId: string
}

export function NewDecisionDialog({ appealId, churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [isNewPerson, setIsNewPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonPhone, setNewPersonPhone] = useState('')
  const [form, setForm] = useState({
    decision_type: 'aceitou_jesus',
    first_time: true,
    notes: '',
  })

  async function searchPeople(q: string) {
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase.from('people').select('id, full_name, phone').eq('church_id', churchId).ilike('full_name', `%${q}%`).limit(5)
    setSearchResults(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    let personId = selectedPerson?.id

    if (isNewPerson && newPersonName) {
      const { data: newPerson } = await supabase
        .from('people')
        .insert({
          church_id: churchId,
          full_name: newPersonName,
          phone: newPersonPhone || null,
          accepted_jesus_at: form.decision_type === 'aceitou_jesus' ? new Date().toISOString().split('T')[0] : null,
          status: 'novo',
          can_serve: false,
          created_by: userId,
        })
        .select()
        .single()

      if (newPerson) {
        personId = newPerson.id
        await supabase.from('journey_events').insert([
          { person_id: newPerson.id, event_type: 'cadastrado', recorded_by: userId },
          { person_id: newPerson.id, event_type: 'aceitou_jesus', recorded_by: userId },
        ])
      }
    }

    if (!personId) { setLoading(false); return }

    await supabase.from('decisions').insert({
      appeal_id: appealId,
      person_id: personId,
      counselor_id: userId,
      decision_type: form.decision_type,
      first_time: form.first_time,
      notes: form.notes || null,
    })

    setLoading(false)
    setOpen(false)
    router.refresh()
    resetForm()
  }

  function resetForm() {
    setSearchQuery('')
    setSearchResults([])
    setSelectedPerson(null)
    setIsNewPerson(false)
    setNewPersonName('')
    setNewPersonPhone('')
    setForm({ decision_type: 'aceitou_jesus', first_time: true, notes: '' })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Registrar Decisão
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
        <DialogContent onClose={() => { setOpen(false); resetForm() }}>
          <DialogHeader>
            <DialogTitle>Registrar Decisão</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Person selection */}
            <div className="space-y-2">
              <Label>Pessoa</Label>
              {selectedPerson ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium">{selectedPerson.full_name}</span>
                  <button type="button" onClick={() => setSelectedPerson(null)} className="text-xs text-slate-400 hover:text-slate-600">Trocar</button>
                </div>
              ) : isNewPerson ? (
                <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs font-medium text-violet-700">Cadastrar nova pessoa</p>
                  <Input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Nome completo *" required />
                  <Input value={newPersonPhone} onChange={e => setNewPersonPhone(e.target.value)} placeholder="WhatsApp (opcional)" />
                  <button type="button" onClick={() => setIsNewPerson(false)} className="text-xs text-violet-600 hover:underline">
                    ← Buscar pessoa existente
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); searchPeople(e.target.value) }}
                      placeholder="Buscar por nome..."
                      className="pl-9"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPerson(p); setSearchResults([]); setSearchQuery('') }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span className="font-medium">{p.full_name}</span>
                          {p.phone && <span className="text-slate-400 ml-2">{p.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setIsNewPerson(true)} className="text-xs text-violet-600 hover:underline">
                    + Cadastrar nova pessoa
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Decisão</Label>
              <Select value={form.decision_type} onChange={e => setForm(p => ({ ...p, decision_type: e.target.value }))}>
                <option value="aceitou_jesus">🙏 Aceitou Jesus</option>
                <option value="reconciliacao">🤝 Reconciliação</option>
                <option value="batismo">💧 Batismo</option>
                <option value="outro">📌 Outro</option>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="first_time"
                checked={form.first_time}
                onChange={e => setForm(p => ({ ...p, first_time: e.target.checked }))}
                className="h-4 w-4 accent-violet-600"
              />
              <Label htmlFor="first_time">Primeira vez (nunca aceitou Jesus antes)</Label>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Alguma observação sobre esta decisão..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancelar</Button>
              <Button type="submit" disabled={loading || (!selectedPerson && !isNewPerson)}>
                {loading ? 'Salvando...' : 'Registrar Decisão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
