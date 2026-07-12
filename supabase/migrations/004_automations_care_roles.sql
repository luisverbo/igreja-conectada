-- ============================================================
-- Migration 004: Mensagens automáticas, encaminhamento de
-- convertidos e hierarquia departamental
-- (já aplicada via MCP em 2026-07-12)
-- ============================================================

-- Novos papéis: supervisor (acesso total), líderes de departamento
-- e ajudante de Novos Membros (só presença)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'super_admin', 'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_leader',
  'new_members_teacher', 'new_members_leader', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader', 'viewer'
));

ALTER TABLE people ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);

CREATE TABLE IF NOT EXISTS followup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL DEFAULT 'aceitou_jesus',
  delay_hours INT NOT NULL DEFAULT 24,
  message_type TEXT NOT NULL DEFAULT 'texto' CHECK (message_type IN ('texto', 'audio', 'video')),
  content TEXT,
  media_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES followup_rules(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou', 'cancelado')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_messages_due_idx ON scheduled_messages(status, send_at);

CREATE TABLE IF NOT EXISTS care_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('M', 'F')),
  age_min INT,
  age_max INT,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS church_access nas três tabelas (igual às demais)
-- + pg_cron chamando /api/cron/dispatch a cada 15 minutos
