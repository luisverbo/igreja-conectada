import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Calendar, MapPin, Edit, BookOpen, Home, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatPhone, getAge, getInitials, journeyDuration, whatsappLink } from '@/lib/utils'
import {
  PERSON_STATUS_LABELS, JOURNEY_EVENT_LABELS,
  type PersonStatus, type JourneyEventType
} from '@/lib/types'

const statusVariant: Record<PersonStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'> = {
  novo: 'secondary',
  em_novos_membros: 'info',
  concluiu_novos_membros: 'info',
  em_discipulado: 'default',
  em_acompanhamento: 'warning',
  servindo: 'success',
  inativo: 'outline',
}

const journeyEventColor: Record<string, string> = {
  aceitou_jesus: 'bg-pink-500',
  cadastrado: 'bg-slate-400',
  entrou_novos_membros: 'bg-blue-500',
  concluiu_novos_membros: 'bg-blue-700',
  entrou_discipulado: 'bg-violet-500',
  inicio_acompanhamento: 'bg-amber-500',
  liberado_para_servir: 'bg-emerald-500',
  passou_a_servir: 'bg-emerald-700',
  observacao: 'bg-slate-400',
  inativado: 'bg-slate-300',
}

export default async function PessoaPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: person },
    { data: journeyEvents },
    { data: enrollments },
    { data: discipleshipMemberships },
    { data: decisions },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase.from('journey_events')
      .select('*, profiles(full_name)')
      .eq('person_id', id)
      .order('event_date', { ascending: false }),
    supabase.from('new_members_enrollments')
      .select('*, new_members_classes(name, status, teacher_id, profiles(full_name))')
      .eq('person_id', id),
    supabase.from('discipleship_members')
      .select('*, discipleships(name, leader_id, profiles(full_name)), discipleship_observations(observation_type, description, observation_date, profiles(full_name))')
      .eq('person_id', id),
    supabase.from('decisions')
      .select('*, appeals(name, culto_date)')
      .eq('person_id', id),
  ])

  if (!person) notFound()

  return (
    <div>
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/pessoas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Pessoas
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white text-lg font-bold">
              {getInitials(person.full_name)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{person.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={statusVariant[person.status as PersonStatus] || 'secondary'}>
                  {PERSON_STATUS_LABELS[person.status as PersonStatus]}
                </Badge>
                {person.can_serve && <Badge variant="success">Apto para Servir</Badge>}
                {person.accepted_jesus_at && (
                  <span className="text-sm text-slate-500">
                    Em jornada há {journeyDuration(person.accepted_jesus_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {person.phone && (
              <a href={whatsappLink(person.phone)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - info */}
        <div className="space-y-4">
          {/* Contact */}
          <Card>
            <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {person.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">{formatPhone(person.phone)}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">{person.email}</span>
                </div>
              )}
              {person.birth_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">{formatDate(person.birth_date)} ({getAge(person.birth_date)})</span>
                </div>
              )}
              {(person.city || person.neighborhood) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">
                    {[person.neighborhood, person.city, person.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal */}
          <Card>
            <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {person.gender && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Gênero</dt>
                    <dd className="text-slate-700">{person.gender === 'M' ? 'Masculino' : person.gender === 'F' ? 'Feminino' : 'Outro'}</dd>
                  </div>
                )}
                {person.marital_status && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Estado Civil</dt>
                    <dd className="text-slate-700 capitalize">{person.marital_status}</dd>
                  </div>
                )}
                {person.profession && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Profissão</dt>
                    <dd className="text-slate-700">{person.profession}</dd>
                  </div>
                )}
                {person.how_met_church && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 flex-shrink-0">Como chegou</dt>
                    <dd className="text-slate-700 text-right">{person.how_met_church}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Cadastrado em</dt>
                  <dd className="text-slate-700">{formatDate(person.created_at)}</dd>
                </div>
              </dl>
              {person.notes && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Observações</p>
                  <p className="text-sm text-amber-800">{person.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decisions */}
          {decisions && decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Decisões em Cultos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {decisions.map((d: any) => (
                  <div key={d.id} className="rounded-lg bg-pink-50 border border-pink-100 p-3">
                    <p className="text-sm font-medium text-pink-800">{d.decision_type === 'aceitou_jesus' ? 'Aceitou Jesus' : d.decision_type}</p>
                    <p className="text-xs text-pink-600">{d.appeals?.name} — {formatDate(d.appeals?.culto_date)}</p>
                    {d.notes && <p className="text-xs text-pink-700 mt-1">{d.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - journey + modules */}
        <div className="lg:col-span-2 space-y-4">
          {/* Novos Membros */}
          {enrollments && enrollments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  Novos Membros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{e.new_members_classes?.name}</p>
                        <p className="text-xs text-slate-500">
                          Professor: {e.new_members_classes?.profiles?.full_name || '—'}
                        </p>
                        <p className="text-xs text-slate-400">Matriculado em {formatDate(e.enrolled_at)}</p>
                      </div>
                      <Badge variant={e.completed ? 'success' : e.new_members_classes?.status === 'ativa' ? 'info' : 'outline'}>
                        {e.completed ? 'Concluído' : e.new_members_classes?.status === 'ativa' ? 'Em curso' : 'Em curso'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discipulados */}
          {discipleshipMemberships && discipleshipMemberships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-violet-500" />
                  Discipulado / Célula
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {discipleshipMemberships.map((dm: any) => (
                    <div key={dm.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{dm.discipleships?.name}</p>
                          <p className="text-xs text-slate-500">
                            Líder: {dm.discipleships?.profiles?.full_name || '—'} · Desde {formatDate(dm.joined_at)}
                          </p>
                        </div>
                        <Badge variant={
                          dm.status === 'liberado_para_servir' ? 'success' :
                          dm.status === 'em_acompanhamento' || dm.status === 'situacao_sensivel' ? 'warning' :
                          dm.status === 'nao_recomendado_servir' ? 'destructive' :
                          dm.status === 'ativo' ? 'default' : 'outline'
                        }>
                          {dm.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {dm.discipleship_observations && dm.discipleship_observations.length > 0 && (
                        <div className="space-y-2 mt-3 border-t border-slate-100 pt-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Observações Pastorais</p>
                          {dm.discipleship_observations.slice(0, 3).map((obs: any, idx: number) => (
                            <div key={idx} className="rounded-lg bg-slate-50 p-2">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm text-slate-700">{obs.description}</p>
                                <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(obs.observation_date)}</span>
                              </div>
                              {obs.profiles?.full_name && (
                                <p className="text-xs text-slate-400 mt-0.5">por {obs.profiles.full_name}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Journey Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo Espiritual</CardTitle>
            </CardHeader>
            <CardContent>
              {journeyEvents && journeyEvents.length > 0 ? (
                <div className="relative space-y-4 pl-8">
                  {/* vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

                  {journeyEvents.map((event: any) => (
                    <div key={event.id} className="relative">
                      {/* dot */}
                      <div className={`absolute -left-5 mt-0.5 h-4 w-4 rounded-full border-2 border-white ${journeyEventColor[event.event_type] || 'bg-slate-400'}`} />
                      <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {JOURNEY_EVENT_LABELS[event.event_type as JourneyEventType] || event.event_type}
                          </p>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(event.event_date)}</span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                        )}
                        {event.profiles?.full_name && (
                          <p className="text-xs text-slate-400 mt-1">por {event.profiles.full_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum evento registrado na jornada</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
