import { t } from '../lib/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deletePrompt, getPrompts, savePrompt, toggleFavorite } from '../services/prompts'
import type { PromptInput } from '../types/prompt'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
export function usePrompts() {
  const { user, ready } = useAuth()
  const queryKey = ['prompts', user?.id ?? 'signed-out']
  const client = useQueryClient()
  const query = useQuery({
    queryKey,
    queryFn: getPrompts,
    enabled: ready && !!supabase && !!user,
    staleTime: 60_000,
    refetchInterval: 30 * 60_000,
    refetchOnWindowFocus: true,
  })
  const refresh = () => client.invalidateQueries({ queryKey })
  const save = useMutation({
    mutationFn: ({ input, id, file }: { input: PromptInput; id?: string; file?: File }) =>
      savePrompt(input, id, file),
    onSuccess: async (_, variables) => {
      await refresh()
      toast.success(variables.id ? t('Prompt updated') : t('Prompt saved'))
    },
    onError: (error) => toast.error(t('Save failed: {message}', { message: t(error.message) })),
  })
  const favorite = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: refresh,
    onError: (error) => toast.error(t(error.message)),
    scope: { id: 'favorites' },
  })
  const remove = useMutation({
    mutationFn: deletePrompt,
    onSuccess: async () => {
      await refresh()
      toast.success(t('Prompt deleted'))
    },
    onError: (error) => toast.error(t('Delete failed: {message}', { message: t(error.message) })),
  })
  return {
    ...query,
    isLoading: query.isLoading || !ready,
    items: query.data ?? [],
    save,
    favorite,
    remove,
  }
}
