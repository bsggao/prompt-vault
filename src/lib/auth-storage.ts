const rememberKey = 'promptvault-remember'

export function setRememberMe(remember: boolean) {
  window.localStorage.setItem(rememberKey, String(remember))
}

// Only Supabase session tokens live here. Passwords, codes and library data do not.
export const authStorage = {
  getItem(key: string) {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    const persistent = window.localStorage.getItem(rememberKey) === 'true'
    const target = persistent ? window.localStorage : window.sessionStorage
    const other = persistent ? window.sessionStorage : window.localStorage
    target.setItem(key, value)
    other.removeItem(key)
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}
