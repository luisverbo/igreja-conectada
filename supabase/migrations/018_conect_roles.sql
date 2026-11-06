-- Cargos do Conect: "Líder do Conect" (distribui e acompanha a caixa) e
-- "Equipe do Conect" (acompanha as pessoas que estão com ela)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
  'super_admin', 'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_full', 'counselor_leader',
  'conect_leader', 'conect_member',
  'new_members_teacher', 'new_members_leader', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader', 'viewer'
));
