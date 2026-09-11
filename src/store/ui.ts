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
  set: (value: Partial<Omit<UIState, 'set' | 'resetFilters'>>) => void
  resetFilters: () => void
}
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      view: 'grid',
      search: '',
      category: 'All',
      model: 'All',
      ratio: 'All',
      sort: 'Newest',
      set,
      resetFilters: () => set({ search: '', category: 'All', model: 'All', ratio: 'All' }),
    }),
    {
      name: 'promptvault-preferences',
      partialize: ({ theme, view, language }) => ({ theme, view, language }),
    },
  ),
)
