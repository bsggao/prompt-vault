import { describe, expect, it, vi, beforeEach } from 'vitest'
const oauth = vi.fn()
const exchange = vi.fn()
vi.mock('../lib/supabase', () => ({
  requireSupabase: () => ({ auth: { signInWithOAuth: oauth, exchangeCodeForSession: exchange } }),
}))
import { finishGoogleSignIn, safeReturnTo, signInWithGoogle } from './auth'
describe('Google OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('window', { location: { origin: 'https://vault.example' } })
  })
  it('only permits known local destinations', () => {
    for (const path of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/%2f%2fevil.example',
      '/auth/callback',
      null,
    ])
      expect(safeReturnTo(path)).toBe('/')
    for (const path of ['/', '/upload', '/favorites', '/edit/abc-123'])
      expect(safeReturnTo(path)).toBe(path)
  })
  it('requests Google login with minimal identity scopes and a safe callback', async () => {
    oauth.mockResolvedValue({ error: null })
    await signInWithGoogle('/upload')
    const request = oauth.mock.calls[0][0]
    expect(request.provider).toBe('google')
    expect(request.options.scopes).toBe('openid email profile')
    const callback = new URL(request.options.redirectTo)
    expect(callback.origin).toBe('https://vault.example')
    expect(callback.pathname).toBe('/auth/callback')
    expect(callback.searchParams.get('next')).toBe('/upload')
  })
  it('exchanges a single-use code once even when React mounts twice', async () => {
    exchange.mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null })
    await Promise.all([finishGoogleSignIn('one-use-code'), finishGoogleSignIn('one-use-code')])
    expect(exchange).toHaveBeenCalledTimes(1)
  })
  it('propagates a failed code exchange instead of reporting successful login', async () => {
    exchange.mockResolvedValue({ data: { session: null }, error: new Error('expired code') })
    await expect(finishGoogleSignIn('expired-code')).rejects.toThrow('expired code')
  })
})
