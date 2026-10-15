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
