-- ============================================================
-- SQLs PENDENTES (migrations 012 a 017) — cole tudo no SQL Editor
-- do Supabase e clique em Run. Pode rodar mais de uma vez.
-- ============================================================

-- ───────────── 012_person_children ─────────────
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

DROP POLICY IF EXISTS "children_select" ON person_children;
CREATE POLICY "children_select" ON person_children
  FOR SELECT USING (church_id = auth_church_id());
DROP POLICY IF EXISTS "children_insert" ON person_children;
CREATE POLICY "children_insert" ON person_children
  FOR INSERT WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'));
DROP POLICY IF EXISTS "children_update" ON person_children;
CREATE POLICY "children_update" ON person_children
  FOR UPDATE USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'))
  WITH CHECK (church_id = auth_church_id());
DROP POLICY IF EXISTS "children_delete" ON person_children;
CREATE POLICY "children_delete" ON person_children
  FOR DELETE USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor','discipleship_leader'));

-- ───────────── 013_rhema_spouse ─────────────
-- RHEMA e cônjuge no cadastro da pessoa (preenchidos pelo link do GCA)
--   rhema_graduated : formado(a) no RHEMA? (NULL = não informado)
--   spouse_id       : cônjuge já cadastrado no sistema (vínculo dos dois lados)
--   spouse_name     : nome informado — fica guardado até o cônjuge se
--                     cadastrar e o sistema fazer o vínculo sozinho
--   spouse_phone    : ajuda a achar o cônjuge certo
--   spouse_in_gca   : 'mesmo_gca' | 'outro_gca' | 'nao_participa'
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS rhema_graduated BOOLEAN,
  ADD COLUMN IF NOT EXISTS spouse_id UUID REFERENCES people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS spouse_name TEXT,
  ADD COLUMN IF NOT EXISTS spouse_phone TEXT,
  ADD COLUMN IF NOT EXISTS spouse_in_gca TEXT
    CHECK (spouse_in_gca IN ('mesmo_gca', 'outro_gca', 'nao_participa'));

CREATE INDEX IF NOT EXISTS people_spouse_idx ON people(spouse_id);

-- ───────────── 014_rhema_status ─────────────
-- RHEMA passa a ter três respostas: formado / cursando / não fez.
-- Substitui o sim/não de people.rhema_graduated (migration 013).
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS rhema_status TEXT
    CHECK (rhema_status IN ('formado', 'cursando', 'nao'));

-- Aproveita o que já foi respondido no formato antigo, se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'people' AND column_name = 'rhema_graduated') THEN
    UPDATE people
       SET rhema_status = CASE WHEN rhema_graduated THEN 'formado' ELSE 'nao' END
     WHERE rhema_graduated IS NOT NULL AND rhema_status IS NULL;
    ALTER TABLE people DROP COLUMN rhema_graduated;
  END IF;
END $$;

-- ───────────── 015_serves_departments ─────────────
-- Departamentos da igreja em que a pessoa serve (informado no link do GCA).
-- NULL = não respondeu · {} = não serve · {'Louvor','Mídia'} = serve nesses
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS serves_departments TEXT[];

-- ───────────── 016_certificates ─────────────
-- Certificados preenchidos pelo próprio casal num link público.
-- Uma "campanha" = um modelo de certificado + o link que é enviado.
CREATE TABLE IF NOT EXISTS certificate_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  template    TEXT NOT NULL DEFAULT 'lideranca-gca',
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES certificate_campaigns(id) ON DELETE CASCADE,
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name1        TEXT NOT NULL,
  name2        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificates_campaign_idx ON certificates(campaign_id);

ALTER TABLE certificate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Leitura: equipe da igreja. Escrita: liderança e supervisão de GCA.
-- (O envio público passa pela API com a chave de serviço.)
DROP POLICY IF EXISTS "cert_campaigns_select" ON certificate_campaigns;
CREATE POLICY "cert_campaigns_select" ON certificate_campaigns
  FOR SELECT USING (church_id = auth_church_id());
DROP POLICY IF EXISTS "cert_campaigns_write" ON certificate_campaigns;
CREATE POLICY "cert_campaigns_write" ON certificate_campaigns
  FOR ALL USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'))
  WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'));

DROP POLICY IF EXISTS "certificates_select" ON certificates;
CREATE POLICY "certificates_select" ON certificates
  FOR SELECT USING (church_id = auth_church_id());
DROP POLICY IF EXISTS "certificates_write" ON certificates;
CREATE POLICY "certificates_write" ON certificates
  FOR ALL USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'))
  WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'));

-- ───────────── 017_conect_flow ─────────────
-- Fluxo 1 — porta de entrada (novo convertido / veio de outra igreja)
--
-- 1) Link fixo do QR Code do balcão do Conect
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS welcome_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS churches_welcome_token_idx ON churches(welcome_token);

-- 2) Registro dos contatos que o Conect faz com cada pessoa
CREATE TABLE IF NOT EXISTS conect_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  contacted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  result        TEXT NOT NULL CHECK (result IN ('conversou', 'nao_atendeu', 'mensagem', 'presencial')),
  wants_nm      BOOLEAN,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conect_contacts_person_idx ON conect_contacts(person_id, created_at DESC);

ALTER TABLE conect_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conect_contacts_select" ON conect_contacts;
CREATE POLICY "conect_contacts_select" ON conect_contacts
  FOR SELECT USING (church_id = auth_church_id());
-- Escrita só pela API (chave de serviço), que confere o cargo de quem registra.

-- 3) Mensagens automáticas agora podem ser para "aceitou Jesus",
--    "veio de outra igreja" ou "todos" (followup_rules.trigger_event é texto livre)

-- 4) Trava de envio: a mensagem fica "enviando" enquanto sai, para o cron
--    e o envio imediato (logo após o cadastro) não mandarem duas vezes
ALTER TABLE scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_status_check;
ALTER TABLE scheduled_messages ADD CONSTRAINT scheduled_messages_status_check
  CHECK (status IN ('pendente', 'enviando', 'enviado', 'falhou', 'cancelado'));

