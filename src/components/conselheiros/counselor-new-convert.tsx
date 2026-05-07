'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  churchId: string
  userId: string
  userName: string
}

export function CounselorNewConvert({ churchId, userId, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    address: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    const { data: person, error: personError } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        address: form.address.trim() || null,
        accepted_jesus_at: new Date().toISOString().split('T')[0],
        status: 'novo',
        can_serve: false,
        created_by: userId,
      })
      .select()
      .single()

    if (personError || !person) {
      setError('Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }

    await supabase.from('journey_events').insert([
      { person_id: person.id, event_type: 'cadastrado', recorded_by: userId },
      { person_id: person.id, event_type: 'aceitou_jesus', recorded_by: userId },
    ])

    setSuccess(form.full_name.trim())
    setForm({ full_name: '', phone: '', birth_date: '', address: '' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-600" />
            Cadastrar Novo Convertido
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">{success} cadastrado(a) com sucesso!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Pode cadastrar o próximo convertido.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Nome do convertido"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento *</Label>
              <Input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={e => set('birth_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input
                id="address"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Rua, número, bairro..."
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Convertido'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
