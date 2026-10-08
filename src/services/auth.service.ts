import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Demo credentials for testing without Supabase
const DEMO_CREDENTIALS = { email: 'demo@example.com', password: 'demo123' }
const demoSession: Session = {
  access_token: 'demo-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'demo-refresh',
  user: {
    id: 'demo-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: DEMO_CREDENTIALS.email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: { name: 'Usuario Demo' },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
} as unknown as Session

export async function getSession() {
  if (!supabase) {
    // Return demo session if stored in sessionStorage
    const stored = sessionStorage.getItem('demo-session')
    return stored ? demoSession : null
  }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function signInEditor(email: string, password: string) {
  // Demo login without Supabase
  if (!supabase) {
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      sessionStorage.setItem('demo-session', 'true')
      return demoSession
    }
    throw new Error(`Credenciales incorrectas. Usa email: ${DEMO_CREDENTIALS.email} y contraseña: ${DEMO_CREDENTIALS.password}`)
  }

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
  if (!supabase) {
    // Demo mode: if session exists and is the demo session, return true
    return session?.user?.email === DEMO_CREDENTIALS.email
  }
  if (!session) return false
  const { data, error } = await supabase.rpc('is_calendar_editor')
  return !error && data === true
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
