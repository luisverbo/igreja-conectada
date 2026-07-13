-- ============================================================
-- Migration 002: Audit fixes
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to people
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin    TEXT CHECK (origin IN ('aceitou_jesus_aqui', 'veio_de_outra_igreja'));

-- 2. Add missing columns to discipleships
ALTER TABLE discipleships
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. Create whatsapp_instances table
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  instance_name   TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  phone_number    TEXT,
  status          TEXT NOT NULL DEFAULT 'close',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, instance_name)
);

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "church_access" ON whatsapp_instances;
CREATE POLICY "church_access" ON whatsapp_instances
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 4. Fix ON DELETE CASCADE for people FK constraints
--    (allows deleting a person who has history in the system)

ALTER TABLE decisions
  DROP CONSTRAINT IF EXISTS decisions_person_id_fkey,
  ADD CONSTRAINT decisions_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE new_members_enrollments
  DROP CONSTRAINT IF EXISTS new_members_enrollments_person_id_fkey,
  ADD CONSTRAINT new_members_enrollments_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE new_members_attendance
  DROP CONSTRAINT IF EXISTS new_members_attendance_person_id_fkey,
  ADD CONSTRAINT new_members_attendance_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE discipleship_members
  DROP CONSTRAINT IF EXISTS discipleship_members_person_id_fkey,
  ADD CONSTRAINT discipleship_members_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE discipleship_observations
  DROP CONSTRAINT IF EXISTS discipleship_observations_person_id_fkey,
  ADD CONSTRAINT discipleship_observations_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
