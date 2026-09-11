import { requireSupabase } from '../lib/supabase'

export function safeReturnTo(value: string | null) {
  return value &&
    (['/', '/upload', '/favorites'].includes(value) || /^\/edit\/[a-zA-Z0-9-]+$/.test(value))
    ? value
    : '/'
}

export async function signInWithGoogle(returnTo: string) {
  const client = requireSupabase()
  const callback = new URL('/auth/callback', window.location.origin)
  callback.searchParams.set('next', safeReturnTo(returnTo))
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
      scopes: 'openid email profile',
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

// StrictMode and repeated mounts must not exchange the same one-use OAuth code twice.
let pendingExchange: { code: string; promise: Promise<void> } | undefined
export function finishGoogleSignIn(code: string) {
  if (pendingExchange?.code === code) return pendingExchange.promise
  const promise = (async () => {
    const { data, error } = await requireSupabase().auth.exchangeCodeForSession(code)
    if (error) throw error
    if (!data.session) throw new Error('Sign-in could not be completed. Please try again.')
  })()
  pendingExchange = { code, promise }
  return promise
}
