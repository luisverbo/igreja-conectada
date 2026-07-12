-- ============================================================
-- Migration 006: Níveis de conselheiro e acesso customizado
-- (já aplicada via MCP em 2026-07-12)
-- ============================================================

-- counselor_full: conselheiro com acesso total ao departamento
-- (vê a aba Conselheiros no desktop, gerencia cultos e decisões)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'super_admin', 'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_full', 'counselor_leader',
  'new_members_teacher', 'new_members_leader', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader', 'viewer'
));

-- custom_access: lista de abas extras que o usuário pode acessar
-- além do que o papel dele permite (ex: supervisor de departamento
-- que precisa ver Pessoas e Relatórios)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_access TEXT[];
