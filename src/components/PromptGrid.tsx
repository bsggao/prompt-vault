import type { PromptItem } from '../types/prompt'
import { PromptCard } from './PromptCard'
import { useUI } from '../store/ui'
export function PromptGrid({
  items,
  onOpen,
  onFavorite,
  favoritePendingId,
  ownerId,
  showVisibility = false,
}: {
  items: PromptItem[]
  onOpen: (item: PromptItem) => void
  onFavorite: (item: PromptItem) => void
  favoritePendingId?: string
  ownerId?: string
  showVisibility?: boolean
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
          favoritePending={favoritePendingId === item.id}
          canFavorite={item.isPublic || (!!ownerId && item.ownerId === ownerId)}
          showVisibility={showVisibility}
        />
      ))}
    </div>
  )
}
