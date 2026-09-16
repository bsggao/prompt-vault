import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    enabled: !!supabase,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('console_settings')
        .select('site_title,description')
        .eq('project_id', 'prompt-vault')
        .single()
      // Branding is optional until the admin migration has been applied.
      if (error?.code === '42P01' || error?.code === 'PGRST205') return null
      if (error) throw error
      return data as { site_title: string; description: string }
    },
  })
}
