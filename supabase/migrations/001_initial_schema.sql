-- ============================================================
-- IGREJA CONECTADA - Schema Completo
-- MVP: Conselheiros + Novos Membros + Discipulados
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- IGREJAS
-- ============================================================
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  address text,
  neighborhood text,
  city text,
  state text,
  phone text,
  email text,
  pastor_name text,
  logo_url text,
  whatsapp_instance text, -- Evolution API instance name
  whatsapp_token text,
  created_at timestamptz default now()
);

-- ============================================================
-- PERFIS DE USUÁRIO (linked to Supabase Auth)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid references churches(id),
  full_name text not null,
  phone text,
  role text not null default 'viewer' check (role in (
    'super_admin',
    'pastor',
    'coordinator',
    'counselor',
    'new_members_teacher',
    'discipleship_supervisor',
    'discipleship_leader',
    'viewer'
  )),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PESSOAS (entidade central - jornada espiritual)
-- ============================================================
create table people (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) not null,
  full_name text not null,
  phone text,
  email text,
  birth_date date,
  gender text check (gender in ('M', 'F', 'outro')),
  marital_status text check (marital_status in ('solteiro', 'casado', 'divorciado', 'viuvo', 'outro')),
  profession text,
  address text,
  neighborhood text,
  city text,
  state text,
  photo_url text,
  -- Jornada espiritual
  accepted_jesus_at date,
  how_met_church text,
  status text default 'novo' check (status in (
    'novo',
    'em_novos_membros',
    'concluiu_novos_membros',
    'em_discipulado',
    'em_acompanhamento',
    'servindo',
    'inativo'
  )),
  can_serve boolean default false,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- JORNADA ESPIRITUAL (eventos da jornada)
-- ============================================================
create table journey_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade not null,
  event_type text not null check (event_type in (
    'aceitou_jesus',
    'cadastrado',
    'entrou_novos_membros',
    'concluiu_novos_membros',
    'entrou_discipulado',
    'inicio_acompanhamento',
    'liberado_para_servir',
    'passou_a_servir',
    'observacao',
    'inativado'
  )),
  description text,
  reference_id uuid,
  reference_type text check (reference_type in ('culto', 'turma', 'discipulado', 'manual')),
  recorded_by uuid references profiles(id),
  event_date date default current_date,
  created_at timestamptz default now()
);

-- ============================================================
-- CONSELHEIROS
-- ============================================================

-- Cultos com apelos
create table appeals (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) not null,
  name text not null,
  culto_date date not null,
  culto_type text check (culto_type in (
    'domingo_manha', 'domingo_noite', 'quarta', 'especial', 'outro'
  )),
  preacher text,
  theme text,
  total_decisions int default 0,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Decisões em cultos
create table decisions (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid references appeals(id) not null,
  person_id uuid references people(id) not null,
  counselor_id uuid references profiles(id),
  decision_type text default 'aceitou_jesus' check (decision_type in (
    'aceitou_jesus', 'reconciliacao', 'batismo', 'outro'
  )),
  first_time boolean default true,
  notes text,
  whatsapp_sent boolean default false,
  whatsapp_sent_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- NOVOS MEMBROS
-- ============================================================

-- Turmas
create table new_members_classes (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) not null,
  name text not null,
  teacher_id uuid references profiles(id),
  start_date date,
  end_date date,
  day_of_week text check (day_of_week in (
    'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'
  )),
  time_start time,
  location text,
  total_lessons int default 4,
  status text default 'ativa' check (status in ('ativa', 'concluida', 'cancelada')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Aulas da turma
create table new_members_lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references new_members_classes(id) on delete cascade not null,
  lesson_number int not null,
  title text not null,
  lesson_date date,
  status text default 'pendente' check (status in ('pendente', 'realizada', 'cancelada')),
  created_at timestamptz default now(),
  unique(class_id, lesson_number)
);

-- Matrículas
create table new_members_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references new_members_classes(id) not null,
  person_id uuid references people(id) not null,
  enrolled_at timestamptz default now(),
  completed boolean default false,
  completed_at timestamptz,
  certificate_issued boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(class_id, person_id)
);

-- Presença (APENAS em Novos Membros)
create table new_members_attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references new_members_lessons(id) on delete cascade not null,
  enrollment_id uuid references new_members_enrollments(id) on delete cascade not null,
  person_id uuid references people(id) not null,
  present boolean default false,
  justified boolean default false,
  notes text,
  recorded_by uuid references profiles(id),
  recorded_at timestamptz default now(),
  unique(lesson_id, person_id)
);

-- ============================================================
-- DISCIPULADOS / CÉLULAS (SEM PRESENÇA - foco em acompanhamento)
-- ============================================================

create table discipleships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) not null,
  name text not null,
  leader_id uuid references profiles(id),
  supervisor_id uuid references profiles(id),
  address text,
  neighborhood text,
  city text,
  day_of_week text check (day_of_week in (
    'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'
  )),
  time_start time,
  meeting_frequency text default 'semanal' check (meeting_frequency in (
    'semanal', 'quinzenal', 'mensal'
  )),
  status text default 'ativo' check (status in ('ativo', 'inativo')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Membros do discipulado (sem presença)
create table discipleship_members (
  id uuid primary key default gen_random_uuid(),
  discipleship_id uuid references discipleships(id) on delete cascade not null,
  person_id uuid references people(id) not null,
  joined_at date default current_date,
  status text default 'ativo' check (status in (
    'ativo',
    'em_acompanhamento',
    'situacao_sensivel',
    'nao_recomendado_servir',
    'liberado_para_servir',
    'inativo'
  )),
  notes text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(discipleship_id, person_id)
);

-- Observações pastorais (substitui presença no discipulado)
create table discipleship_observations (
  id uuid primary key default gen_random_uuid(),
  discipleship_id uuid references discipleships(id) on delete cascade not null,
  member_id uuid references discipleship_members(id) on delete cascade not null,
  person_id uuid references people(id) not null,
  observation_type text not null check (observation_type in (
    'ativo',
    'em_acompanhamento',
    'situacao_sensivel',
    'nao_recomendado_servir',
    'liberado_para_servir',
    'geral'
  )),
  description text not null,
  needs_care boolean default false,
  recorded_by uuid references profiles(id),
  observation_date date default current_date,
  created_at timestamptz default now()
);

-- ============================================================
-- WHATSAPP NOTIFICAÇÕES
-- ============================================================

create table whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id),
  person_id uuid references people(id),
  phone text not null,
  message_type text not null check (message_type in (
    'boas_vindas_decisao',
    'boas_vindas_novos_membros',
    'conclusao_novos_membros',
    'alerta_acompanhamento',
    'alerta_pastoral',
    'comunicado_geral'
  )),
  message text not null,
  status text default 'pending' check (status in ('pending', 'sent', 'failed', 'delivered')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Atualiza updated_at automaticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_people_updated_at
  before update on people
  for each row execute function update_updated_at_column();

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_discipleship_members_updated_at
  before update on discipleship_members
  for each row execute function update_updated_at_column();

-- Conta total de decisões por culto
create or replace function update_appeal_decisions_count()
returns trigger as $$
begin
  update appeals
  set total_decisions = (
    select count(*) from decisions where appeal_id = new.appeal_id
  )
  where id = new.appeal_id;
  return new;
end;
$$ language plpgsql;

create trigger update_decisions_count
  after insert or delete on decisions
  for each row execute function update_appeal_decisions_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table churches enable row level security;
alter table profiles enable row level security;
alter table people enable row level security;
alter table journey_events enable row level security;
alter table appeals enable row level security;
alter table decisions enable row level security;
alter table new_members_classes enable row level security;
alter table new_members_lessons enable row level security;
alter table new_members_enrollments enable row level security;
alter table new_members_attendance enable row level security;
alter table discipleships enable row level security;
alter table discipleship_members enable row level security;
alter table discipleship_observations enable row level security;
alter table whatsapp_notifications enable row level security;

-- Policies: usuários autenticados da mesma igreja têm acesso
create policy "church_access" on churches
  for all using (
    id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on profiles
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on people
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on journey_events
  for all using (
    person_id in (select id from people where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on appeals
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on decisions
  for all using (
    appeal_id in (select id from appeals where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on new_members_classes
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on new_members_lessons
  for all using (
    class_id in (select id from new_members_classes where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on new_members_enrollments
  for all using (
    class_id in (select id from new_members_classes where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on new_members_attendance
  for all using (
    lesson_id in (select id from new_members_lessons where class_id in (
      select id from new_members_classes where church_id in (
        select church_id from profiles where id = auth.uid()
      )
    ))
  );

create policy "church_access" on discipleships
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

create policy "church_access" on discipleship_members
  for all using (
    discipleship_id in (select id from discipleships where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on discipleship_observations
  for all using (
    discipleship_id in (select id from discipleships where church_id in (
      select church_id from profiles where id = auth.uid()
    ))
  );

create policy "church_access" on whatsapp_notifications
  for all using (
    church_id in (select church_id from profiles where id = auth.uid())
  );

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

create index idx_people_church_id on people(church_id);
create index idx_people_status on people(status);
create index idx_people_phone on people(phone);
create index idx_journey_events_person_id on journey_events(person_id);
create index idx_decisions_appeal_id on decisions(appeal_id);
create index idx_decisions_person_id on decisions(person_id);
create index idx_enrollments_class_id on new_members_enrollments(class_id);
create index idx_attendance_lesson_id on new_members_attendance(lesson_id);
create index idx_discipleship_members_person_id on discipleship_members(person_id);
create index idx_observations_member_id on discipleship_observations(member_id);
create index idx_observations_person_id on discipleship_observations(person_id);
