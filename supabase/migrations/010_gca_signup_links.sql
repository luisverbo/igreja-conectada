-- Links de cadastro de membros de GCA
-- * discipleships.signup_token  → link fixo de UM GCA (o líder manda no grupo dele)
-- * churches.gca_signup_token   → link geral: a pessoa escolhe o próprio GCA
ALTER TABLE discipleships
  ADD COLUMN IF NOT EXISTS signup_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS discipleships_signup_token_idx ON discipleships(signup_token);

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS gca_signup_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS churches_gca_signup_token_idx ON churches(gca_signup_token);
