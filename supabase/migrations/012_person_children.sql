-- Filhos (crianças) dos membros, cadastrados pelo próprio membro no
-- link de cadastro do GCA. NÃO são membros do GCA: não contam no limite
-- de participantes, só aparecem na contagem de crianças.
CREATE TABLE IF NOT EXISTS person_children (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  parent_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  birth_date  DATE,
  gender      TEXT CHECK (gender IN ('M', 'F')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS person_children_parent_idx ON person_children(parent_id);
CREATE INDEX IF NOT EXISTS person_children_church_idx ON person_children(church_id);

ALTER TABLE person_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_select" ON person_children
  FOR SELECT USING (church_id = auth_church_id());
CREATE POLICY "children_insert" ON person_children
  FOR INSERT WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'));
CREATE POLICY "children_update" ON person_children
  FOR UPDATE USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'))
  WITH CHECK (church_id = auth_church_id());
CREATE POLICY "children_delete" ON person_children
  FOR DELETE USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'));
