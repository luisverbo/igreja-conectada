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
