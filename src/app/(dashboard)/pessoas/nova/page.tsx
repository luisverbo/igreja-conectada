'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NovaPessoaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
    marital_status: '',
    profession: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    accepted_jesus_at: '',
    how_met_church: '',
    notes: '',
  })

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Não autenticado'); setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('church_id, id').eq('id', user.id).single()
    if (!profile?.church_id) { setError('Igreja não encontrada'); setLoading(false); return }

    const payload: Record<string, string | null | boolean> = {
      church_id: profile.church_id,
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      marital_status: form.marital_status || null,
      profession: form.profession || null,
      address: form.address || null,
      neighborhood: form.neighborhood || null,
      city: form.city || null,
      state: form.state || null,
      accepted_jesus_at: form.accepted_jesus_at || null,
      how_met_church: form.how_met_church || null,
      notes: form.notes || null,
      status: 'novo',
      can_serve: false,
      created_by: profile.id,
    }

    const { data: person, error: personError } = await supabase
      .from('people')
      .insert(payload)
      .select()
      .single()

    if (personError || !person) {
      setError(personError?.message || 'Erro ao cadastrar pessoa')
      setLoading(false)
      return
    }

    // Registrar evento de jornada
    await supabase.from('journey_events').insert({
      person_id: person.id,
      event_type: 'cadastrado',
      description: 'Pessoa cadastrada no sistema',
      recorded_by: profile.id,
    })

    if (form.accepted_jesus_at) {
      await supabase.from('journey_events').insert({
        person_id: person.id,
        event_type: 'aceitou_jesus',
        description: 'Aceitou Jesus',
        event_date: form.accepted_jesus_at,
        recorded_by: profile.id,
      })
    }

    router.push(`/pessoas/${person.id}`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 p-6 pb-0">
        <Link href="/pessoas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Cadastrar Nova Pessoa</h1>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nome completo da pessoa"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp / Telefone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select id="gender" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} placeholder="Selecione">
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="outro">Outro</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Select id="marital_status" value={form.marital_status} onChange={(e) => handleChange('marital_status', e.target.value)} placeholder="Selecione">
                    <option value="solteiro">Solteiro(a)</option>
                    <option value="casado">Casado(a)</option>
                    <option value="divorciado">Divorciado(a)</option>
                    <option value="viuvo">Viúvo(a)</option>
                    <option value="outro">Outro</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    value={form.profession}
                    onChange={(e) => handleChange('profession', e.target.value)}
                    placeholder="Profissão"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Rua, número, complemento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações espirituais */}
          <Card>
            <CardHeader>
              <CardTitle>Jornada Espiritual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accepted_jesus_at">Data em que Aceitou Jesus</Label>
                  <Input
                    id="accepted_jesus_at"
                    type="date"
                    value={form.accepted_jesus_at}
                    onChange={(e) => handleChange('accepted_jesus_at', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="how_met_church">Como chegou à Igreja</Label>
                  <Input
                    id="how_met_church"
                    value={form.how_met_church}
                    onChange={(e) => handleChange('how_met_church', e.target.value)}
                    placeholder="Ex: convite de amigo, redes sociais..."
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Anotações gerais sobre a pessoa..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Cadastrar Pessoa'}
            </Button>
            <Link href="/pessoas">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
