-- ============================================================
-- Migration 005: Locais de GCA (casas/anfitriões) e CPF
-- (já aplicada via MCP em 2026-07-12)
-- ============================================================

ALTER TABLE people ADD COLUMN IF NOT EXISTS cpf TEXT;

CREATE TABLE IF NOT EXISTS gca_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'casa' CHECK (location_type IN ('igreja', 'casa')),
  host_name TEXT,
  host_phone TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS church_access igual às demais tabelas

ALTER TABLE discipleships ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES gca_locations(id) ON DELETE SET NULL;
