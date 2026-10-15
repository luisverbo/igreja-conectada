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
