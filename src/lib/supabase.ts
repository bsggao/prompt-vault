import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'promptvault-auth',
          storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
        },
      })
    : null

export function requireSupabase() {
  if (!supabase) throw new Error('Cloud storage is not configured yet.')
  return supabase
}
