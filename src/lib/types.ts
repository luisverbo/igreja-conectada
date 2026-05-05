// ============================================================
// TIPOS CENTRAIS - Igreja Conectada
// ============================================================

export type UserRole =
  | 'super_admin'
  | 'pastor'
  | 'coordinator'
  | 'counselor'
  | 'new_members_teacher'
  | 'discipleship_supervisor'
  | 'discipleship_leader'
  | 'viewer'

export type PersonStatus =
  | 'novo'
  | 'em_novos_membros'
  | 'concluiu_novos_membros'
  | 'em_discipulado'
  | 'em_acompanhamento'
  | 'servindo'
  | 'inativo'

export type JourneyEventType =
  | 'aceitou_jesus'
  | 'cadastrado'
  | 'entrou_novos_membros'
  | 'concluiu_novos_membros'
  | 'entrou_discipulado'
  | 'inicio_acompanhamento'
  | 'liberado_para_servir'
  | 'passou_a_servir'
  | 'observacao'
  | 'inativado'

export type DiscipleshipMemberStatus =
  | 'ativo'
  | 'em_acompanhamento'
  | 'situacao_sensivel'
  | 'nao_recomendado_servir'
  | 'liberado_para_servir'
  | 'inativo'

export type ObservationType =
  | 'ativo'
  | 'em_acompanhamento'
  | 'situacao_sensivel'
  | 'nao_recomendado_servir'
  | 'liberado_para_servir'
  | 'geral'

// ============================================================
// ENTIDADES
// ============================================================

export interface Church {
  id: string
  name: string
  cnpj?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  pastor_name?: string
  logo_url?: string
  whatsapp_instance?: string
  created_at: string
}

export interface Profile {
  id: string
  church_id: string
  full_name: string
  phone?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Person {
  id: string
  church_id: string
  full_name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: 'M' | 'F' | 'outro'
  marital_status?: string
  profession?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  photo_url?: string
  accepted_jesus_at?: string
  how_met_church?: string
  status: PersonStatus
  can_serve: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface JourneyEvent {
  id: string
  person_id: string
  event_type: JourneyEventType
  description?: string
  reference_id?: string
  reference_type?: string
  recorded_by?: string
  event_date: string
  created_at: string
  profiles?: Pick<Profile, 'full_name'>
}

// ============================================================
// CONSELHEIROS
// ============================================================

export interface Appeal {
  id: string
  church_id: string
  name: string
  culto_date: string
  culto_type?: string
  preacher?: string
  theme?: string
  total_decisions: number
  notes?: string
  created_by?: string
  created_at: string
}

export interface Decision {
  id: string
  appeal_id: string
  person_id: string
  counselor_id?: string
  decision_type: 'aceitou_jesus' | 'reconciliacao' | 'batismo' | 'outro'
  first_time: boolean
  notes?: string
  whatsapp_sent: boolean
  created_at: string
  people?: Pick<Person, 'id' | 'full_name' | 'phone'>
  profiles?: Pick<Profile, 'full_name'>
}

// ============================================================
// NOVOS MEMBROS
// ============================================================

export interface NewMembersClass {
  id: string
  church_id: string
  name: string
  teacher_id?: string
  start_date?: string
  end_date?: string
  day_of_week?: string
  time_start?: string
  location?: string
  total_lessons: number
  status: 'ativa' | 'concluida' | 'cancelada'
  notes?: string
  created_at: string
  profiles?: Pick<Profile, 'full_name'>
  enrollments_count?: number
}

export interface NewMembersLesson {
  id: string
  class_id: string
  lesson_number: number
  title: string
  lesson_date?: string
  status: 'pendente' | 'realizada' | 'cancelada'
  created_at: string
}

export interface NewMembersEnrollment {
  id: string
  class_id: string
  person_id: string
  enrolled_at: string
  completed: boolean
  completed_at?: string
  certificate_issued: boolean
  notes?: string
  people?: Pick<Person, 'id' | 'full_name' | 'phone'>
}

export interface NewMembersAttendance {
  id: string
  lesson_id: string
  enrollment_id: string
  person_id: string
  present: boolean
  justified: boolean
  notes?: string
  recorded_by?: string
  recorded_at: string
}

// ============================================================
// DISCIPULADOS
// ============================================================

export interface Discipleship {
  id: string
  church_id: string
  name: string
  leader_id?: string
  supervisor_id?: string
  address?: string
  neighborhood?: string
  city?: string
  day_of_week?: string
  time_start?: string
  meeting_frequency: string
  status: 'ativo' | 'inativo'
  notes?: string
  created_at: string
  leader?: Pick<Profile, 'id' | 'full_name' | 'phone'>
  supervisor?: Pick<Profile, 'id' | 'full_name'>
  members_count?: number
}

export interface DiscipleshipMember {
  id: string
  discipleship_id: string
  person_id: string
  joined_at: string
  status: DiscipleshipMemberStatus
  notes?: string
  updated_at: string
  created_at: string
  people?: Pick<Person, 'id' | 'full_name' | 'phone' | 'status'>
}

export interface DiscipleshipObservation {
  id: string
  discipleship_id: string
  member_id: string
  person_id: string
  observation_type: ObservationType
  description: string
  needs_care: boolean
  recorded_by?: string
  observation_date: string
  created_at: string
  profiles?: Pick<Profile, 'full_name'>
}

// ============================================================
// WHATSAPP
// ============================================================

export interface WhatsappNotification {
  id: string
  church_id?: string
  person_id?: string
  phone: string
  message_type: string
  message: string
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  sent_at?: string
  created_at: string
}

// ============================================================
// UTILS
// ============================================================

export const PERSON_STATUS_LABELS: Record<PersonStatus, string> = {
  novo: 'Novo',
  em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu Novos Membros',
  em_discipulado: 'Em Discipulado',
  em_acompanhamento: 'Em Acompanhamento',
  servindo: 'Servindo',
  inativo: 'Inativo',
}

export const JOURNEY_EVENT_LABELS: Record<JourneyEventType, string> = {
  aceitou_jesus: 'Aceitou Jesus',
  cadastrado: 'Cadastrado no sistema',
  entrou_novos_membros: 'Entrou em Novos Membros',
  concluiu_novos_membros: 'Concluiu Novos Membros',
  entrou_discipulado: 'Entrou no Discipulado',
  inicio_acompanhamento: 'Início do Acompanhamento',
  liberado_para_servir: 'Liberado para Servir',
  passou_a_servir: 'Passou a Servir',
  observacao: 'Observação',
  inativado: 'Inativado',
}

export const DISCIPLESHIP_STATUS_LABELS: Record<DiscipleshipMemberStatus, string> = {
  ativo: 'Ativo',
  em_acompanhamento: 'Em Acompanhamento',
  situacao_sensivel: 'Situação Sensível',
  nao_recomendado_servir: 'Não Recomendado para Servir',
  liberado_para_servir: 'Liberado para Servir',
  inativo: 'Inativo',
}

export const DAY_OF_WEEK_LABELS: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}
