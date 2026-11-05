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
CREATE POLICY "cert_campaigns_select" ON certificate_campaigns
  FOR SELECT USING (church_id = auth_church_id());
CREATE POLICY "cert_campaigns_write" ON certificate_campaigns
  FOR ALL USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'))
  WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'));

CREATE POLICY "certificates_select" ON certificates
  FOR SELECT USING (church_id = auth_church_id());
CREATE POLICY "certificates_write" ON certificates
  FOR ALL USING (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'))
  WITH CHECK (church_id = auth_church_id() AND auth_role() IN
    ('super_admin','pastor','coordinator','supervisor','discipleship_supervisor'));
