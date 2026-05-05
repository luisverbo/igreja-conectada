'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardEdit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DISCIPLESHIP_STATUS_LABELS, type DiscipleshipMemberStatus } from '@/lib/types'

interface Props {
  memberId: string
  discipleshipId: string
  personId: string
  personName: string
  currentStatus: DiscipleshipMemberStatus
  userId: string
}

export function ObservationDialog({ memberId, discipleshipId, personId, personName, currentStatus, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newStatus, setNewStatus] = useState<DiscipleshipMemberStatus>(currentStatus)
  const [obsType, setObsType] = useState<string>('geral')
  const [description, setDescription] = useState('')
  const [needsCare, setNeedsCare] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Add observation
    await supabase.from('discipleship_observations').insert({
      discipleship_id: discipleshipId,
      member_id: memberId,
      person_id: personId,
      observation_type: obsType,
      description,
      needs_care: needsCare,
      recorded_by: userId,
      observation_date: new Date().toISOString().split('T')[0],
    })

    // Update member status if changed
    if (newStatus !== currentStatus) {
      await supabase.from('discipleship_members').update({ status: newStatus }).eq('id', memberId)

      // Update person status and journey if liberado or needs care
      if (newStatus === 'liberado_para_servir') {
        await supabase.from('people').update({ can_serve: true }).eq('id', personId)
        await supabase.from('journey_events').insert({
          person_id: personId,
          event_type: 'liberado_para_servir',
          description: description || 'Liberado para servir pelo líder de discipulado',
          recorded_by: userId,
        })
      } else if (newStatus === 'em_acompanhamento') {
        await supabase.from('journey_events').insert({
          person_id: personId,
          event_type: 'inicio_acompanhamento',
          description: description || 'Iniciado acompanhamento pastoral',
          recorded_by: userId,
        })
      }
    }

    setLoading(false)
    setOpen(false)
    setDescription('')
    setNeedsCare(false)
    router.refresh()
  }

  const statusOptions: DiscipleshipMemberStatus[] = [
    'ativo', 'em_acompanhamento', 'situacao_sensivel',
    'nao_recomendado_servir', 'liberado_para_servir', 'inativo'
  ]

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ClipboardEdit className="h-3 w-3 mr-1" />
        Observação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Observação Pastoral</DialogTitle>
            <DialogDescription>{personName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Status do Membro</Label>
              <Select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as DiscipleshipMemberStatus)}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{DISCIPLESHIP_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Observação</Label>
              <Select value={obsType} onChange={e => setObsType(e.target.value)}>
                <option value="geral">Geral</option>
                <option value="ativo">Ativo</option>
                <option value="em_acompanhamento">Em Acompanhamento</option>
                <option value="situacao_sensivel">Situação Sensível</option>
                <option value="nao_recomendado_servir">Não Recomendado para Servir</option>
                <option value="liberado_para_servir">Liberado para Servir</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva a situação espiritual, necessidades, progresso..."
                rows={4}
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="needs_care"
                checked={needsCare}
                onChange={e => setNeedsCare(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <Label htmlFor="needs_care">⚠️ Esta pessoa precisa de cuidado pastoral especial</Label>
            </div>

            {newStatus === 'liberado_para_servir' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm text-emerald-800 font-medium">✅ Ao liberar para servir:</p>
                <p className="text-xs text-emerald-700 mt-1">A pessoa será marcada como apta para servir na igreja e um evento será registrado na jornada espiritual.</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || !description.trim()}>
                {loading ? 'Salvando...' : 'Registrar Observação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
