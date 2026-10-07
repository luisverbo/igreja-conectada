-- 1) Apagar pessoa: o log de WhatsApp bloqueava (FK sem ON DELETE).
--    Mantém o histórico de mensagens, só desvincula a pessoa.
ALTER TABLE whatsapp_notifications
  DROP CONSTRAINT IF EXISTS whatsapp_notifications_person_id_fkey,
  ADD CONSTRAINT whatsapp_notifications_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

-- 2) Limite de participantes por GCA
--    churches.gca_default_max_members → vale para todos os GCAs
--    discipleships.max_members        → limite próprio (sobrepõe o padrão)
ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS gca_default_max_members INT CHECK (gca_default_max_members > 0);
ALTER TABLE discipleships
  ADD COLUMN IF NOT EXISTS max_members INT CHECK (max_members > 0);
