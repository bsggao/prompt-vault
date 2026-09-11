import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
})
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!supabase)
  const client = useQueryClient()
  const previousUser = useRef<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.id ?? null
      if (previousUser.current !== nextUser) {
        void client.cancelQueries({ queryKey: ['prompts'] })
        client.removeQueries({ queryKey: ['prompts'] })
        previousUser.current = nextUser
      }
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [client])
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
