import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Sessão + perfil do usuário, deduplicado por request via React cache().
 * O layout e a página compartilham a MESMA chamada — antes cada navegação
 * fazia 2x auth.getUser() + 2x fetch do profile (4 round-trips ao Supabase).
 */
export const getSessionProfile = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, profile: null }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, church_id, full_name, phone, role, is_active, custom_access')
    .eq('id', user.id)
    .single()
  return { supabase, user, profile }
})
