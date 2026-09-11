import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface UIState {
  theme: 'light' | 'dark'
  language: 'en' | 'zh'
  view: 'grid' | 'list'
  search: string
  category: string
  model: string
  ratio: string
  sort: string
  authOpen: boolean
  pendingFavoriteId: string | null
  set: (
    value: Partial<Omit<UIState, 'set' | 'resetFilters' | 'setAuthOpen' | 'setPendingFavoriteId'>>,
  ) => void
  setAuthOpen: (open: boolean) => void
  setPendingFavoriteId: (id: string | null) => void
  resetFilters: () => void
}
const preferredLanguage =
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
    ? 'zh'
    : 'en'
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: preferredLanguage,
      view: 'grid',
      search: '',
      category: 'All',
      model: 'All',
      ratio: 'All',
      sort: 'Newest',
      authOpen: false,
      pendingFavoriteId: null,
      set,
      setAuthOpen: (authOpen) => set({ authOpen }),
      setPendingFavoriteId: (pendingFavoriteId) => set({ pendingFavoriteId }),
      resetFilters: () => set({ search: '', category: 'All', model: 'All', ratio: 'All' }),
    }),
    {
      name: 'promptvault-preferences',
      partialize: ({ theme, view, language }) => ({ theme, view, language }),
    },
  ),
)
