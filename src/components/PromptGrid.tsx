import type { PromptItem } from '../types/prompt'
import { PromptCard } from './PromptCard'
import { useUI } from '../store/ui'
export function PromptGrid({
  items,
  onOpen,
  onFavorite,
  favoritePending,
}: {
  items: PromptItem[]
  onOpen: (item: PromptItem) => void
  onFavorite: (item: PromptItem) => void
  favoritePending: boolean
}) {
  const view = useUI((s) => s.view)
  return (
    <div className={`prompt-grid ${view === 'list' ? 'list-view' : ''}`}>
      {items.map((item, index) => (
        <PromptCard
          key={item.id}
          item={item}
          index={index}
          onOpen={() => onOpen(item)}
          onFavorite={() => onFavorite(item)}
          favoritePending={favoritePending}
        />
      ))}
    </div>
  )
}
