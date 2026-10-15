-- Departamentos da igreja em que a pessoa serve (informado no link do GCA).
-- NULL = não respondeu · {} = não serve · {'Louvor','Mídia'} = serve nesses
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS serves_departments TEXT[];
