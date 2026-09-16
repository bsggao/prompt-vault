import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useBusinessAccess() {
  const { user, ready } = useAuth()
  return useQuery({
    queryKey: ['business-access', user?.id],
    enabled: ready && !!user && !!supabase,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('console_can_write')
      // Older deployments work until the admin migration is applied.
      if (error?.code === 'PGRST202') return true
      if (error) throw error
      return data as boolean
    },
  })
}
