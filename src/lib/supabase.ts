import { createClient } from '@supabase/supabase-js'
import { authStorage } from './auth-storage'
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'promptvault-auth',
          storage: typeof window === 'undefined' ? undefined : authStorage,
        },
      })
    : null

export function requireSupabase() {
  if (!supabase) throw new Error('Cloud storage is not configured yet.')
  return supabase
}

// Keep recovery verification isolated until the new password is successfully saved.
export function createRecoveryClient() {
  requireSupabase()
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
