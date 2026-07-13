-- ============================================================
-- Migration 008: Endurecimento de RLS para produção
-- (já aplicada via MCP em 2026-07-12)
--
-- Antes: todas as tabelas tinham policy FOR ALL escopada só por
-- igreja — QUALQUER membro podia alterar o próprio role (escalação
-- de privilégio) e deletar/alterar qualquer dado da igreja pelo
-- console do navegador. Agora a escrita é por papel.
-- ============================================================

-- Funções auxiliares (SECURITY DEFINER evita recursão de RLS)
CREATE OR REPLACE FUNCTION auth_church_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT church_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION profiles_self_update_allowed(
  p_id uuid, p_role text, p_church uuid, p_active boolean, p_custom text[]
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_id AND role = p_role AND church_id = p_church
      AND is_active = p_active AND (custom_access IS NOT DISTINCT FROM p_custom)
  )
$$;

-- PROFILES: corrige escalação de privilégio.
-- Usuário só edita o PRÓPRIO perfil e não pode mudar role/church/
-- is_active/custom_access (essas mudanças só via APIs com service role).
DROP POLICY IF EXISTS "church_access" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (church_id = auth_church_id());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND profiles_self_update_allowed(id, role, church_id, is_active, custom_access));

-- CHURCHES: só liderança edita
DROP POLICY IF EXISTS "church_access" ON churches;
DROP POLICY IF EXISTS "churches_select" ON churches;
DROP POLICY IF EXISTS "churches_update_leadership" ON churches;
CREATE POLICY "churches_select" ON churches FOR SELECT USING (id = auth_church_id());
CREATE POLICY "churches_update_leadership" ON churches FOR UPDATE
  USING (id = auth_church_id() AND auth_role() IN ('super_admin','pastor','coordinator','supervisor'))
  WITH CHECK (id = auth_church_id());

-- Demais tabelas: SELECT/INSERT para a igreja onde os fluxos exigem;
-- UPDATE/DELETE restritos aos papéis do departamento + liderança.
-- (SQL completo idêntico ao aplicado — ver migration no Supabase:
--  people, journey_events, appeals, decisions, new_members_classes,
--  new_members_lessons, new_members_enrollments, new_members_attendance,
--  discipleships, discipleship_members, discipleship_observations,
--  gca_locations, followup_rules, care_rules, scheduled_messages,
--  whatsapp_instances, enrollment_waitlist, whatsapp_notifications)
--
-- Resumo por tabela:
--   people:        SELECT/INSERT/UPDATE igreja · DELETE liderança
--   journey:       SELECT/INSERT igreja · DELETE liderança
--   appeals:       INSERT igreja · UPDATE/DELETE liderança+conselheiros(lider/full)
--   decisions:     INSERT igreja · DELETE liderança+conselheiros(lider/full)
--   classes:       INSERT/UPDATE equipe NM · DELETE liderança+líder NM
--   lessons:       INSERT/UPDATE equipe NM (helper só UPDATE) · DELETE liderança+líder
--   enrollments:   INSERT/UPDATE/DELETE professores+líder NM+liderança
--   attendance:    INSERT/UPDATE/DELETE equipe NM incl. auxiliar
--   discipleships: INSERT/UPDATE/DELETE liderança+supervisor GCA
--   gca members:   INSERT dept+conselheiros/NM (fluxos) · UPDATE/DELETE equipe GCA
--   observations:  INSERT/DELETE equipe GCA
--   gca_locations: escrita liderança+supervisor GCA
--   followup/care: FOR ALL liderança
--   scheduled_msgs: SELECT liderança (escrita só service role)
--   whatsapp_inst: FOR ALL liderança
--   waitlist:      SELECT igreja · escrita NM+liderança
