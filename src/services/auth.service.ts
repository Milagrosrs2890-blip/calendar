import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export async function getSession() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function signInEditor(email: string, password: string) {
  if (!supabase) throw new Error('Configura Supabase para iniciar sesión.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: allowed, error: roleError } = await supabase.rpc('is_calendar_editor')
  if (roleError || !allowed) {
    await supabase.auth.signOut()
    throw new Error('Esta cuenta no tiene permisos de edición.')
  }
  return data.session
}

export async function verifyEditor(session: Session | null) {
  if (!supabase || !session) return false
  const { data, error } = await supabase.rpc('is_calendar_editor')
  return !error && data === true
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
