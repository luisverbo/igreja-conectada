-- Departamentos da igreja (Louvor, Diaconato, Kids...): um "GCA sem casa".
-- Líder opcional (só o nome ou com login), link de cadastro próprio e
-- membros ligados às pessoas já cadastradas.
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  -- outros nomes que as pessoas escrevem para este departamento
  -- (ex.: Louvor ← "música", "ministério de louvor", "banda")
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  leader_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  leader_name   TEXT,
  leader_phone  TEXT,
  signup_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS departments_church_idx ON departments(church_id);

CREATE TABLE IF NOT EXISTS department_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  -- de onde veio: link do departamento, link do GCA, sugestão confirmada, manual
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('link', 'gca', 'sugestao', 'manual')),
  added_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, person_id)
);
CREATE INDEX IF NOT EXISTS department_members_person_idx ON department_members(person_id);
CREATE INDEX IF NOT EXISTS department_members_church_idx ON department_members(church_id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
-- Leitura pela equipe da igreja; escrita só pela API (chave de serviço),
-- que confere se é liderança ou o líder daquele departamento.
DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT USING (church_id = auth_church_id());
DROP POLICY IF EXISTS "department_members_select" ON department_members;
CREATE POLICY "department_members_select" ON department_members FOR SELECT USING (church_id = auth_church_id());

-- Cargo "Líder de Departamento" (login opcional para o líder)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'super_admin', 'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_full', 'counselor_leader',
  'conect_leader', 'conect_member',
  'new_members_teacher', 'new_members_leader', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader',
  'department_leader',
  'viewer'
));
