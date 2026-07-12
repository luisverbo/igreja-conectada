-- ============================================================
-- Migration 003: Professor por aula, janela de inscrição,
-- QR fixo da igreja e fila de espera
-- (já aplicada via MCP em 2026-07-12)
-- ============================================================

-- Professor por aula
ALTER TABLE new_members_lessons
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id);

-- Janela de inscrição por turma
ALTER TABLE new_members_classes
  ADD COLUMN IF NOT EXISTS enrollment_open BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS close_after_lesson INT;

-- QR code fixo por igreja
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS registration_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS churches_registration_token_idx ON churches(registration_token);

-- Fila de espera
CREATE TABLE IF NOT EXISTS enrollment_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'matriculado', 'cancelado')),
  enrolled_class_id UUID REFERENCES new_members_classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_waitlist_waiting_unique
  ON enrollment_waitlist(church_id, person_id) WHERE status = 'aguardando';

ALTER TABLE enrollment_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "church_access" ON enrollment_waitlist;
CREATE POLICY "church_access" ON enrollment_waitlist
  FOR ALL USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
  );
