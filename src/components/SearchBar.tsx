import { useI18n } from '../lib/i18n'
import { Search, X } from 'lucide-react'
import { useUI } from '../store/ui'
export function SearchBar() {
  const { t } = useI18n()

  const { search, set } = useUI()
  return (
    <div className="search-bar">
      <Search size={17} />
      <input
        type="search"
        aria-label={t('Search prompts')}
        placeholder={t('Search prompts, titles, tags...')}
        value={search}
        onChange={(e) => set({ search: e.target.value })}
      />
      {search ? (
        <button aria-label={t('Clear search')} onClick={() => set({ search: '' })}>
          <X size={15} />
        </button>
      ) : (
        <span className="search-shortcut">⌘ K</span>
      )}
    </div>
  )
}
