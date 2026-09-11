import { afterEach, describe, expect, it, vi } from 'vitest'
import { authStorage, setRememberMe } from './auth-storage'
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}
describe('Remember-me session storage', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('uses durable tokens only when selected, migrates storage, and clears both on sign-out', () => {
    const localStorage = storage(),
      sessionStorage = storage()
    vi.stubGlobal('window', { localStorage, sessionStorage })
    authStorage.setItem('promptvault-auth', 'session-only')
    expect(localStorage.getItem('promptvault-auth')).toBeNull()
    expect(authStorage.getItem('promptvault-auth')).toBe('session-only')
    setRememberMe(true)
    authStorage.setItem('promptvault-auth', 'persistent')
    expect(localStorage.getItem('promptvault-auth')).toBe('persistent')
    expect(sessionStorage.getItem('promptvault-auth')).toBeNull()
    setRememberMe(false)
    authStorage.setItem('promptvault-auth', 'private-tab')
    expect(localStorage.getItem('promptvault-auth')).toBeNull()
    expect(authStorage.getItem('promptvault-auth')).toBe('private-tab')
    authStorage.removeItem('promptvault-auth')
    expect(authStorage.getItem('promptvault-auth')).toBeNull()
  })
})
