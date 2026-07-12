-- ============================================================
-- Migration 007: Liderança de casal nos GCAs
-- (já aplicada via MCP em 2026-07-12)
-- ============================================================

-- Os GCAs normalmente são liderados por um casal (jovens pode ser
-- uma pessoa só). O Líder 1 sempre tem acesso ao sistema; o Líder 2
-- pode ser outro usuário (leader2_id) ou apenas o nome do cônjuge
-- sem acesso (leader2_name).
ALTER TABLE discipleships
  ADD COLUMN IF NOT EXISTS leader2_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS leader2_name TEXT;
