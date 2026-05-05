'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Props {
  discipleshipId: string
  churchId: string
  userId: string
}

export function AddMemberDialog({ discipleshipId, churchId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])

  async function search(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('people')
      .select('id, full_name, phone, status')
      .eq('church_id', churchId)
      .ilike('full_name', `%${q}%`)
      .limit(8)
    setSearchResults(data?.filter(p => !selected.find(s => s.id === p.id)) || [])
  }

  function add(person: any) {
    setSelected(prev => [...prev, person])
    setSearchResults([])
    setSearchQuery('')
  }

  function remove(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  async function handleAdd() {
    setLoading(true)
    const supabase = createClient()

    const members = selected.map(p => ({
      discipleship_id: discipleshipId,
      person_id: p.id,
      status: 'ativo',
    }))

    await supabase.from('discipleship_members').upsert(members, { onConflict: 'discipleship_id,person_id' })

    // Update person status and journey
    for (const p of selected) {
      await supabase.from('people').update({ status: 'em_discipulado' }).eq('id', p.id)
      await supabase.from('journey_events').insert({
        person_id: p.id,
        event_type: 'entrou_discipulado',
        reference_id: discipleshipId,
        reference_type: 'discipulado',
        recorded_by: userId,
      })
    }

    setLoading(false)
    setOpen(false)
    setSelected([])
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Adicionar Membro
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setSelected([]); setSearchQuery(''); setSearchResults([]) } }}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Adicionar Membros ao Discipulado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={searchQuery} onChange={e => search(e.target.value)} placeholder="Buscar pessoa por nome..." className="pl-9" />
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id} type="button" onClick={() => add(p)}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-900">{p.full_name}</span>
                    {p.phone && <span className="text-slate-400 ml-2 text-xs">{p.phone}</span>}
                    <span className="ml-2 text-xs text-slate-400">({p.status?.replace(/_/g, ' ')})</span>
                  </button>
                ))}
              </div>
            )}

            {selected.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Selecionados ({selected.length})</p>
                {selected.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                    <span className="text-sm font-medium text-violet-800">{p.full_name}</span>
                    <button type="button" onClick={() => remove(p.id)} className="text-xs text-violet-400 hover:text-violet-600">Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={loading || selected.length === 0}>
              {loading ? 'Adicionando...' : `Adicionar ${selected.length > 0 ? `(${selected.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
